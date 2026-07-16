import {
  one,
  run,
  withTransaction,
  getSetting,
  sqlNow,
  sqlNowPlusDays,
} from '../db/schema.js';
import { createNotification } from './notifications.js';
import { notifyHoldReleased } from './telegram.js';

export async function approveOrderToHold(orderId, adminNote) {
  const order = await one('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) throw new Error('Không tìm thấy đơn');
  if (['paid', 'held', 'rejected', 'cancelled'].includes(order.status)) {
    throw new Error(`Không duyệt được đơn ở trạng thái ${order.status}`);
  }

  const holdDays = parseInt(getSetting('hold_days', '7'), 10) || 7;
  const cashback = order.cashback_amount;

  await withTransaction(async (tx) => {
    if (order.status === 'pending' || order.status === 'completed') {
      await tx.run(
        `UPDATE users SET
          pending_balance = CASE WHEN pending_balance - ? < 0 THEN 0 ELSE pending_balance - ? END,
          held_balance = held_balance + ?
         WHERE id = ?`,
        [cashback, cashback, cashback, order.user_id]
      );
    } else {
      await tx.run(
        `UPDATE users SET held_balance = held_balance + ? WHERE id = ?`,
        [cashback, order.user_id]
      );
    }

    await tx.run(
      `UPDATE orders SET
        status = 'held',
        hold_until = ${sqlNowPlusDays(holdDays)},
        admin_note = ?,
        complete_time = ${sqlNow()},
        updated_at = ${sqlNow()}
       WHERE id = ?`,
      [adminNote || `Hold ${holdDays} ngày`, orderId]
    );

    await tx.run(
      `INSERT INTO wallet_transactions
       (user_id, type, amount, status, reference_type, reference_id, description)
       VALUES (?, 'cashback_hold', ?, 'pending', 'order', ?, ?)`,
      [
        order.user_id,
        cashback,
        orderId,
        `Hold ${holdDays} ngày — đơn #${order.order_id || orderId}`,
      ]
    );
  });

  await createNotification({
    userId: order.user_id,
    type: 'order_held',
    title: 'Đơn đã được duyệt (đang hold)',
    body: `Đơn #${order.order_id || orderId} được duyệt. Tiền hoàn ${Number(cashback).toLocaleString('vi-VN')}đ sẽ vào ví sau ${holdDays} ngày.`,
    meta: { orderId },
  });

  return one('SELECT * FROM orders WHERE id = ?', [orderId]);
}

export async function releaseHeldOrders() {
  const due = await manyDue();
  let total = 0;
  for (const order of due) {
    try {
      await releaseOneOrder(order.id);
      total += Number(order.cashback_amount) || 0;
    } catch (e) {
      console.error('release order', order.id, e.message);
    }
  }
  if (due.length > 0) {
    notifyHoldReleased(due.length, total).catch(() => {});
  }
  return { released: due.length, totalAmount: total };
}

async function manyDue() {
  const { many } = await import('../db/schema.js');
  return many(
    `SELECT * FROM orders
     WHERE status = 'held'
       AND hold_until IS NOT NULL
       AND hold_until <= ${sqlNow()}`
  );
}

export async function releaseOneOrder(orderId, { force = false } = {}) {
  const order = await one('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order || order.status !== 'held') {
    if (order?.status === 'paid') return order;
    throw new Error('Đơn không ở trạng thái held');
  }
  if (!force && order.hold_until) {
    const stillHeld = await one(
      `SELECT id FROM orders WHERE id = ? AND hold_until > ${sqlNow()}`,
      [orderId]
    );
    if (stillHeld) throw new Error('Chưa hết thời gian hold');
  }

  const user = await one('SELECT * FROM users WHERE id = ?', [order.user_id]);
  if (!user) throw new Error('User không tồn tại');

  const f1Rate = parseFloat(getSetting('f1_rate', '0.05'));
  const f2Rate = parseFloat(getSetting('f2_rate', '0.02'));
  const cashback = order.cashback_amount;

  await withTransaction(async (tx) => {
    await tx.run(
      `UPDATE users SET
        held_balance = CASE WHEN held_balance - ? < 0 THEN 0 ELSE held_balance - ? END,
        balance = balance + ?
       WHERE id = ?`,
      [cashback, cashback, cashback, user.id]
    );

    const balRow = await tx.one('SELECT balance FROM users WHERE id = ?', [
      user.id,
    ]);
    const newBalance = balRow.balance;

    await tx.run(
      `INSERT INTO wallet_transactions
       (user_id, type, amount, balance_after, status, reference_type, reference_id, description)
       VALUES (?, 'cashback', ?, ?, 'completed', 'order', ?, ?)`,
      [
        user.id,
        cashback,
        newBalance,
        order.id,
        `Hoàn tiền khả dụng đơn #${order.order_id || order.id}`,
      ]
    );

    await tx.run(
      `UPDATE orders SET status = 'paid', updated_at = ${sqlNow()} WHERE id = ?`,
      [order.id]
    );

    if (user.referred_by) {
      const f1Amount = Math.round(cashback * f1Rate);
      if (f1Amount > 0) {
        await tx.run('UPDATE users SET balance = balance + ? WHERE id = ?', [
          f1Amount,
          user.referred_by,
        ]);
        const f1Bal = await tx.one('SELECT balance FROM users WHERE id = ?', [
          user.referred_by,
        ]);
        await tx.run(
          `INSERT INTO wallet_transactions
           (user_id, type, amount, balance_after, status, reference_type, reference_id, description)
           VALUES (?, 'referral_f1', ?, ?, 'completed', 'order', ?, ?)`,
          [user.referred_by, f1Amount, f1Bal.balance, order.id, `Hoa hồng F1 từ ${user.name}`]
        );

        const f1User = await tx.one('SELECT * FROM users WHERE id = ?', [
          user.referred_by,
        ]);
        if (f1User?.referred_by) {
          const f2Amount = Math.round(cashback * f2Rate);
          if (f2Amount > 0) {
            await tx.run('UPDATE users SET balance = balance + ? WHERE id = ?', [
              f2Amount,
              f1User.referred_by,
            ]);
            const f2Bal = await tx.one('SELECT balance FROM users WHERE id = ?', [
              f1User.referred_by,
            ]);
            await tx.run(
              `INSERT INTO wallet_transactions
               (user_id, type, amount, balance_after, status, reference_type, reference_id, description)
               VALUES (?, 'referral_f2', ?, ?, 'completed', 'order', ?, ?)`,
              [
                f1User.referred_by,
                f2Amount,
                f2Bal.balance,
                order.id,
                `Hoa hồng F2 từ tuyến dưới của ${user.name}`,
              ]
            );
          }
        }
      }
    }
  });

  await createNotification({
    userId: user.id,
    type: 'order_paid',
    title: 'Tiền hoàn đã vào ví',
    body: `+${Number(cashback).toLocaleString('vi-VN')}đ từ đơn #${order.order_id || order.id}`,
    meta: { orderId: order.id },
  });

  return one('SELECT * FROM orders WHERE id = ?', [orderId]);
}

export async function creditOrderCashback(orderId) {
  const order = await one('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order || order.status === 'paid') return null;
  if (order.status === 'held') {
    return releaseOneOrder(orderId, { force: true });
  }
  await approveOrderToHold(orderId, 'Demo credit');
  return releaseOneOrder(orderId, { force: true });
}

export async function recordPendingOrder({
  userId,
  linkId,
  orderId,
  conversionId,
  productName,
  productImage,
  orderAmount,
  totalCommission,
  cashbackAmount,
  purchaseTime,
  source = 'demo',
  claimNote = null,
  status = 'pending',
  platform = 'shopee',
  fraudScore = 0,
  fraudFlags = null,
}) {
  if (orderId) {
    const existing = await one('SELECT id FROM orders WHERE order_id = ?', [
      String(orderId),
    ]);
    if (existing) throw new Error('Mã đơn hàng này đã được khai báo');
  }

  const info = await run(
    `INSERT INTO orders
     (user_id, link_id, platform, order_id, conversion_id, product_name, product_image,
      order_amount, total_commission, cashback_amount, status, source, claim_note,
      fraud_score, fraud_flags, purchase_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      linkId || null,
      platform,
      orderId ? String(orderId) : null,
      conversionId || null,
      productName,
      productImage,
      orderAmount,
      totalCommission,
      cashbackAmount,
      status,
      source,
      claimNote,
      fraudScore,
      fraudFlags ? JSON.stringify(fraudFlags) : null,
      purchaseTime || new Date().toISOString(),
    ]
  );

  if (status === 'pending' || status === 'completed') {
    await run(
      'UPDATE users SET pending_balance = pending_balance + ? WHERE id = ?',
      [cashbackAmount, userId]
    );
    await run(
      `INSERT INTO wallet_transactions
       (user_id, type, amount, status, reference_type, reference_id, description)
       VALUES (?, 'cashback', ?, 'pending', 'order', ?, ?)`,
      [
        userId,
        cashbackAmount,
        info.lastInsertRowid,
        `Đơn tạm tính: ${productName || orderId}`,
      ]
    );
  }

  return { id: info.lastInsertRowid };
}

export async function rejectOrder(orderId, adminNote) {
  const order = await one('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) throw new Error('Không tìm thấy đơn');
  if (order.status === 'paid') throw new Error('Đơn đã thanh toán');

  await withTransaction(async (tx) => {
    if (order.status === 'pending' || order.status === 'completed') {
      await tx.run(
        `UPDATE users SET pending_balance = CASE WHEN pending_balance - ? < 0 THEN 0 ELSE pending_balance - ? END WHERE id = ?`,
        [order.cashback_amount, order.cashback_amount, order.user_id]
      );
    }
    if (order.status === 'held') {
      await tx.run(
        `UPDATE users SET held_balance = CASE WHEN held_balance - ? < 0 THEN 0 ELSE held_balance - ? END WHERE id = ?`,
        [order.cashback_amount, order.cashback_amount, order.user_id]
      );
    }
    await tx.run(
      `UPDATE orders SET status = 'rejected', admin_note = ?, updated_at = ${sqlNow()} WHERE id = ?`,
      [adminNote || null, orderId]
    );
  });

  await createNotification({
    userId: order.user_id,
    type: 'order_rejected',
    title: 'Đơn bị từ chối',
    body: adminNote || 'Đơn không khớp đối soát Affiliate',
    meta: { orderId },
  });
}

export async function requestWithdraw(userId, amount, method, paymentInfo) {
  const minWithdraw = parseFloat(getSetting('min_withdraw', '50000'));
  const user = await one('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) throw new Error('User không tồn tại');
  if (user.status === 'banned') throw new Error('Tài khoản bị khóa');
  if (amount < minWithdraw) {
    throw new Error(
      `Số tiền rút tối thiểu là ${minWithdraw.toLocaleString('vi-VN')}đ`
    );
  }
  if (user.balance < amount) throw new Error('Số dư không đủ');

  return withTransaction(async (tx) => {
    await tx.run('UPDATE users SET balance = balance - ? WHERE id = ?', [
      amount,
      userId,
    ]);
    const bal = await tx.one('SELECT balance FROM users WHERE id = ?', [userId]);

    const w = await tx.run(
      `INSERT INTO withdraw_requests
       (user_id, amount, method, bank_name, bank_account, bank_holder, momo_phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        amount,
        method,
        paymentInfo.bankName || null,
        paymentInfo.bankAccount || null,
        paymentInfo.bankHolder || null,
        paymentInfo.momoPhone || null,
      ]
    );

    await tx.run(
      `INSERT INTO wallet_transactions
       (user_id, type, amount, balance_after, status, reference_type, reference_id, description)
       VALUES (?, 'withdraw', ?, ?, 'pending', 'withdraw', ?, ?)`,
      [
        userId,
        -amount,
        bal.balance,
        w.lastInsertRowid,
        `Yêu cầu rút tiền ${method.toUpperCase()}`,
      ]
    );

    await createNotification({
      roleTarget: 'admin',
      type: 'withdraw',
      title: 'Yêu cầu rút tiền',
      body: `${user.name} rút ${amount.toLocaleString('vi-VN')}đ qua ${method}`,
      meta: { withdrawId: w.lastInsertRowid },
    });

    return w.lastInsertRowid;
  });
}
