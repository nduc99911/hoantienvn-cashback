import { db, getSetting } from '../db/schema.js';
import { createNotification } from './notifications.js';
import { notifyHoldReleased } from './telegram.js';

function addDaysSql(days) {
  return `datetime('now', '+${parseInt(days, 10) || 7} days')`;
}

/**
 * Duyệt đơn → đưa vào HOLD (chưa vào balance khả dụng)
 * status: held
 */
export function approveOrderToHold(orderId, adminNote) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) throw new Error('Không tìm thấy đơn');
  if (['paid', 'held', 'rejected', 'cancelled'].includes(order.status)) {
    throw new Error(`Không duyệt được đơn ở trạng thái ${order.status}`);
  }

  const holdDays = parseInt(getSetting('hold_days', '7'), 10) || 7;
  const cashback = order.cashback_amount;

  const run = db.transaction(() => {
    // Nếu đã cộng pending (pending/completed) → chuyển pending → held
    if (order.status === 'pending' || order.status === 'completed') {
      db.prepare(
        `UPDATE users SET
          pending_balance = MAX(0, pending_balance - ?),
          held_balance = held_balance + ?
         WHERE id = ?`
      ).run(cashback, cashback, order.user_id);
    } else {
      // pending_review: chưa cộng pending
      db.prepare(
        `UPDATE users SET held_balance = held_balance + ? WHERE id = ?`
      ).run(cashback, order.user_id);
    }

    db.prepare(
      `UPDATE orders SET
        status = 'held',
        hold_until = ${addDaysSql(holdDays)},
        admin_note = ?,
        complete_time = datetime('now'),
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(adminNote || `Hold ${holdDays} ngày`, orderId);

    db.prepare(
      `INSERT INTO wallet_transactions
       (user_id, type, amount, status, reference_type, reference_id, description)
       VALUES (?, 'cashback_hold', ?, 'pending', 'order', ?, ?)`
    ).run(
      order.user_id,
      cashback,
      orderId,
      `Hold ${holdDays} ngày — đơn #${order.order_id || orderId}`
    );

    createNotification({
      userId: order.user_id,
      type: 'order_held',
      title: 'Đơn đã được duyệt (đang hold)',
      body: `Đơn #${order.order_id || orderId} được duyệt. Tiền hoàn ${cashback.toLocaleString('vi-VN')}đ sẽ vào ví sau ${holdDays} ngày.`,
      meta: { orderId },
    });
  });

  run();
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
}

/**
 * Nhả hold hết hạn → balance + F1/F2
 */
export function releaseHeldOrders() {
  const due = db
    .prepare(
      `SELECT * FROM orders
       WHERE status = 'held'
         AND hold_until IS NOT NULL
         AND hold_until <= datetime('now')`
    )
    .all();

  let total = 0;
  for (const order of due) {
    try {
      releaseOneOrder(order.id);
      total += order.cashback_amount;
    } catch (e) {
      console.error('release order', order.id, e.message);
    }
  }

  if (due.length > 0) {
    notifyHoldReleased(due.length, total).catch(() => {});
  }
  return { released: due.length, totalAmount: total };
}

export function releaseOneOrder(orderId, { force = false } = {}) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order || order.status !== 'held') {
    if (order?.status === 'paid') return order;
    throw new Error('Đơn không ở trạng thái held');
  }
  if (!force && order.hold_until) {
    const stillHeld = db
      .prepare(
        `SELECT id FROM orders WHERE id = ? AND hold_until > datetime('now')`
      )
      .get(orderId);
    if (stillHeld) throw new Error('Chưa hết thời gian hold');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id);
  if (!user) throw new Error('User không tồn tại');

  const f1Rate = parseFloat(getSetting('f1_rate', '0.05'));
  const f2Rate = parseFloat(getSetting('f2_rate', '0.02'));
  const cashback = order.cashback_amount;

  const run = db.transaction(() => {
    db.prepare(
      `UPDATE users SET
        held_balance = MAX(0, held_balance - ?),
        balance = balance + ?
       WHERE id = ?`
    ).run(cashback, cashback, user.id);

    const newBalance = db
      .prepare('SELECT balance FROM users WHERE id = ?')
      .get(user.id).balance;

    db.prepare(
      `INSERT INTO wallet_transactions
       (user_id, type, amount, balance_after, status, reference_type, reference_id, description)
       VALUES (?, 'cashback', ?, ?, 'completed', 'order', ?, ?)`
    ).run(
      user.id,
      cashback,
      newBalance,
      order.id,
      `Hoàn tiền khả dụng đơn #${order.order_id || order.id}`
    );

    db.prepare(
      `UPDATE orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?`
    ).run(order.id);

    createNotification({
      userId: user.id,
      type: 'order_paid',
      title: 'Tiền hoàn đã vào ví',
      body: `+${cashback.toLocaleString('vi-VN')}đ từ đơn #${order.order_id || order.id}`,
      meta: { orderId: order.id },
    });

    // F1 / F2
    if (user.referred_by) {
      const f1Amount = Math.round(cashback * f1Rate);
      if (f1Amount > 0) {
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(
          f1Amount,
          user.referred_by
        );
        const f1Bal = db
          .prepare('SELECT balance FROM users WHERE id = ?')
          .get(user.referred_by).balance;
        db.prepare(
          `INSERT INTO wallet_transactions
           (user_id, type, amount, balance_after, status, reference_type, reference_id, description)
           VALUES (?, 'referral_f1', ?, ?, 'completed', 'order', ?, ?)`
        ).run(
          user.referred_by,
          f1Amount,
          f1Bal,
          order.id,
          `Hoa hồng F1 từ ${user.name}`
        );
        createNotification({
          userId: user.referred_by,
          type: 'referral',
          title: 'Hoa hồng F1',
          body: `+${f1Amount.toLocaleString('vi-VN')}đ từ ${user.name}`,
        });

        const f1User = db
          .prepare('SELECT * FROM users WHERE id = ?')
          .get(user.referred_by);
        if (f1User?.referred_by) {
          const f2Amount = Math.round(cashback * f2Rate);
          if (f2Amount > 0) {
            db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(
              f2Amount,
              f1User.referred_by
            );
            const f2Bal = db
              .prepare('SELECT balance FROM users WHERE id = ?')
              .get(f1User.referred_by).balance;
            db.prepare(
              `INSERT INTO wallet_transactions
               (user_id, type, amount, balance_after, status, reference_type, reference_id, description)
               VALUES (?, 'referral_f2', ?, ?, 'completed', 'order', ?, ?)`
            ).run(
              f1User.referred_by,
              f2Amount,
              f2Bal,
              order.id,
              `Hoa hồng F2 từ tuyến dưới của ${user.name}`
            );
          }
        }
      }
    }
  });

  run();
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
}

/** Legacy: credit ngay (demo) */
export function creditOrderCashback(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order || order.status === 'paid') return null;
  if (order.status === 'held') {
    return releaseOneOrder(orderId, { force: true });
  }
  // put on hold with 0 days then release — or approve then force release
  approveOrderToHold(orderId, 'Demo credit');
  return releaseOneOrder(orderId, { force: true });
}

export function recordPendingOrder({
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
    const existing = db
      .prepare('SELECT id FROM orders WHERE order_id = ?')
      .get(String(orderId));
    if (existing) throw new Error('Mã đơn hàng này đã được khai báo');
  }

  const info = db
    .prepare(
      `INSERT INTO orders
       (user_id, link_id, platform, order_id, conversion_id, product_name, product_image,
        order_amount, total_commission, cashback_amount, status, source, claim_note,
        fraud_score, fraud_flags, purchase_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
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
      purchaseTime || new Date().toISOString()
    );

  if (status === 'pending' || status === 'completed') {
    db.prepare(
      'UPDATE users SET pending_balance = pending_balance + ? WHERE id = ?'
    ).run(cashbackAmount, userId);

    db.prepare(
      `INSERT INTO wallet_transactions
       (user_id, type, amount, status, reference_type, reference_id, description)
       VALUES (?, 'cashback', ?, 'pending', 'order', ?, ?)`
    ).run(
      userId,
      cashbackAmount,
      info.lastInsertRowid,
      `Đơn tạm tính: ${productName || orderId}`
    );
  }

  return { id: info.lastInsertRowid };
}

export function rejectOrder(orderId, adminNote) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) throw new Error('Không tìm thấy đơn');
  if (order.status === 'paid') throw new Error('Đơn đã thanh toán');

  const run = db.transaction(() => {
    if (order.status === 'pending' || order.status === 'completed') {
      db.prepare(
        'UPDATE users SET pending_balance = MAX(0, pending_balance - ?) WHERE id = ?'
      ).run(order.cashback_amount, order.user_id);
    }
    if (order.status === 'held') {
      db.prepare(
        'UPDATE users SET held_balance = MAX(0, held_balance - ?) WHERE id = ?'
      ).run(order.cashback_amount, order.user_id);
    }
    db.prepare(
      `UPDATE orders SET status = 'rejected', admin_note = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(adminNote || null, orderId);

    createNotification({
      userId: order.user_id,
      type: 'order_rejected',
      title: 'Đơn bị từ chối',
      body: adminNote || 'Đơn không khớp đối soát Affiliate',
      meta: { orderId },
    });
  });
  run();
}

export function requestWithdraw(userId, amount, method, paymentInfo) {
  const minWithdraw = parseFloat(getSetting('min_withdraw', '50000'));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('User không tồn tại');
  if (user.status === 'banned') throw new Error('Tài khoản bị khóa');
  if (amount < minWithdraw) {
    throw new Error(
      `Số tiền rút tối thiểu là ${minWithdraw.toLocaleString('vi-VN')}đ`
    );
  }
  if (user.balance < amount) throw new Error('Số dư không đủ');

  const run = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(
      amount,
      userId
    );
    const bal = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId)
      .balance;

    const w = db
      .prepare(
        `INSERT INTO withdraw_requests
         (user_id, amount, method, bank_name, bank_account, bank_holder, momo_phone, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
      )
      .run(
        userId,
        amount,
        method,
        paymentInfo.bankName || null,
        paymentInfo.bankAccount || null,
        paymentInfo.bankHolder || null,
        paymentInfo.momoPhone || null
      );

    db.prepare(
      `INSERT INTO wallet_transactions
       (user_id, type, amount, balance_after, status, reference_type, reference_id, description)
       VALUES (?, 'withdraw', ?, ?, 'pending', 'withdraw', ?, ?)`
    ).run(
      userId,
      -amount,
      bal,
      w.lastInsertRowid,
      `Yêu cầu rút tiền ${method.toUpperCase()}`
    );

    createNotification({
      roleTarget: 'admin',
      type: 'withdraw',
      title: 'Yêu cầu rút tiền',
      body: `${user.name} rút ${amount.toLocaleString('vi-VN')}đ qua ${method}`,
      meta: { withdrawId: w.lastInsertRowid },
    });

    return w.lastInsertRowid;
  });

  return run();
}
