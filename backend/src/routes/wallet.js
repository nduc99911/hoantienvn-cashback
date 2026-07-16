import { Router } from 'express';
import { one, many, run, withTransaction, sqlNow, getSetting } from '../db/schema.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  requestWithdraw,
  creditOrderCashback,
  recordPendingOrder,
  releaseHeldOrders,
} from '../services/wallet.js';
import { notifyWithdraw } from '../services/telegram.js';

const router = Router();

function maybeRelease() {
  releaseHeldOrders().catch(() => {});
}

router.get('/summary', requireAuth, async (req, res) => {
  try {
    maybeRelease();
    const u = await one('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const orderStats = await one(
      `SELECT
         COUNT(*) as totalOrders,
         COALESCE(SUM(CASE WHEN status IN ('pending','completed','pending_review') THEN cashback_amount ELSE 0 END),0) as pendingCashback,
         COALESCE(SUM(CASE WHEN status = 'held' THEN cashback_amount ELSE 0 END),0) as heldCashback,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN cashback_amount ELSE 0 END),0) as paidCashback
       FROM orders WHERE user_id = ?`,
      [u.id]
    );
    const refCount = await one(
      'SELECT COUNT(*) as c FROM users WHERE referred_by = ?',
      [u.id]
    );
    const referralEarn = await one(
      `SELECT COALESCE(SUM(amount),0) as total FROM wallet_transactions
       WHERE user_id = ? AND type IN ('referral_f1','referral_f2') AND status = 'completed'`,
      [u.id]
    );

    res.json({
      balance: u.balance,
      pendingBalance: u.pending_balance,
      heldBalance: u.held_balance || 0,
      totalOrders: Number(orderStats?.totalOrders || 0),
      paidCashback: Number(orderStats?.paidCashback || 0),
      heldCashback: Number(orderStats?.heldCashback || 0),
      referralCount: Number(refCount?.c || 0),
      referralEarn: Number(referralEarn?.total || 0),
      referralCode: u.referral_code,
      holdDays: parseInt(getSetting('hold_days', '7'), 10),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/transactions', requireAuth, async (req, res) => {
  const rows = await many(
    `SELECT * FROM wallet_transactions WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  );
  res.json({
    transactions: rows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balance_after,
      status: t.status,
      description: t.description,
      createdAt: t.created_at,
    })),
  });
});

router.get('/orders', requireAuth, async (req, res) => {
  const rows = await many(
    `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  );
  res.json({
    orders: rows.map((o) => ({
      id: o.id,
      orderId: o.order_id,
      platform: o.platform,
      productName: o.product_name,
      productImage: o.product_image,
      orderAmount: o.order_amount,
      cashbackAmount: o.cashback_amount,
      status: o.status,
      source: o.source,
      claimNote: o.claim_note,
      adminNote: o.admin_note,
      holdUntil: o.hold_until,
      fraudScore: o.fraud_score,
      purchaseTime: o.purchase_time,
      completeTime: o.complete_time,
      createdAt: o.created_at,
    })),
  });
});

router.post('/withdraw', requireAuth, async (req, res) => {
  try {
    const { amount, method } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ error: 'Số tiền không hợp lệ' });
    }
    if (!['bank', 'momo'].includes(method)) {
      return res.status(400).json({ error: 'Phương thức: bank hoặc momo' });
    }

    const paymentInfo = {
      bankName: req.body.bankName || req.user.bank_name,
      bankAccount: req.body.bankAccount || req.user.bank_account,
      bankHolder: req.body.bankHolder || req.user.bank_holder,
      momoPhone: req.body.momoPhone || req.user.momo_phone || req.user.phone,
    };

    if (method === 'bank' && (!paymentInfo.bankAccount || !paymentInfo.bankHolder)) {
      return res.status(400).json({ error: 'Vui lòng cập nhật thông tin ngân hàng' });
    }
    if (method === 'momo' && !paymentInfo.momoPhone) {
      return res.status(400).json({ error: 'Vui lòng cập nhật số MoMo' });
    }

    const id = await requestWithdraw(req.user.id, amt, method, paymentInfo);
    notifyWithdraw({
      userName: req.user.name,
      userId: req.user.id,
      amount: amt,
      method,
      ...paymentInfo,
    }).catch(() => {});
    res.json({ success: true, withdrawId: id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/withdrawals', requireAuth, async (req, res) => {
  const rows = await many(
    `SELECT * FROM withdraw_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json({
    withdrawals: rows.map((w) => ({
      id: w.id,
      amount: w.amount,
      method: w.method,
      status: w.status,
      adminNote: w.admin_note,
      createdAt: w.created_at,
      processedAt: w.processed_at,
    })),
  });
});

router.get('/referrals', requireAuth, async (req, res) => {
  const f1 = await many(
    `SELECT id, name, email, created_at,
      (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = users.id) as f2Count
     FROM users WHERE referred_by = ? ORDER BY created_at DESC`,
    [req.user.id]
  );

  res.json({
    referralCode: req.user.referral_code,
    f1: f1.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
      f2Count: u.f2Count || u.f2count || 0,
      joinedAt: u.created_at,
    })),
  });
});

router.post('/demo-order', requireAuth, async (req, res) => {
  try {
    const amount = Number(req.body.orderAmount) || 250000;
    const commission = Number(req.body.commission) || Math.round(amount * 0.14);
    const share = parseFloat(process.env.CASHBACK_SHARE_RATIO || '0.70');
    const cashback = Math.round(commission * share);

    const order = await recordPendingOrder({
      userId: req.user.id,
      linkId: req.body.linkId || null,
      orderId: `DEMO${Date.now()}`,
      conversionId: `CONV${Date.now()}`,
      productName: req.body.productName || 'Đơn demo Shopee',
      productImage: req.body.productImage || null,
      orderAmount: amount,
      totalCommission: commission,
      cashbackAmount: cashback,
      purchaseTime: new Date().toISOString(),
    });

    res.json({ success: true, order, cashback });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/orders/:id/complete', requireAuth, async (req, res) => {
  try {
    const order = await one('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn' });
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền' });
    }
    if (order.status === 'paid') {
      return res.status(400).json({ error: 'Đơn đã được thanh toán' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Đơn đã hủy' });
    }

    await run(
      `UPDATE orders SET status = 'completed', complete_time = ${sqlNow()}, updated_at = ${sqlNow()} WHERE id = ?`,
      [order.id]
    );

    await creditOrderCashback(order.id);
    const updated = await one('SELECT * FROM orders WHERE id = ?', [order.id]);
    const user = await one(
      'SELECT balance, pending_balance FROM users WHERE id = ?',
      [order.user_id]
    );
    res.json({
      success: true,
      order: {
        id: updated.id,
        status: updated.status,
        cashbackAmount: updated.cashback_amount,
      },
      balance: user.balance,
      pendingBalance: user.pending_balance,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/withdrawals/:id/process', requireAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'status không hợp lệ' });
    }
    const w = await one('SELECT * FROM withdraw_requests WHERE id = ?', [
      req.params.id,
    ]);
    if (!w) return res.status(404).json({ error: 'Không tìm thấy' });

    await withTransaction(async (tx) => {
      if (status === 'rejected' && w.status === 'pending') {
        await tx.run('UPDATE users SET balance = balance + ? WHERE id = ?', [
          w.amount,
          w.user_id,
        ]);
        const bal = await tx.one('SELECT balance FROM users WHERE id = ?', [
          w.user_id,
        ]);
        await tx.run(
          `INSERT INTO wallet_transactions
           (user_id, type, amount, balance_after, status, reference_type, reference_id, description)
           VALUES (?, 'adjust', ?, ?, 'completed', 'withdraw', ?, ?)`,
          [w.user_id, w.amount, bal.balance, w.id, 'Hoàn tiền do từ chối rút']
        );
      }
      await tx.run(
        `UPDATE withdraw_requests SET status = ?, admin_note = ?, processed_at = ${sqlNow()} WHERE id = ?`,
        [status, note || null, w.id]
      );
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
