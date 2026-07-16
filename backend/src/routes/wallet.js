import { Router } from 'express';
import { db } from '../db/schema.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  requestWithdraw,
  creditOrderCashback,
  recordPendingOrder,
  releaseHeldOrders,
} from '../services/wallet.js';
import { notifyWithdraw } from '../services/telegram.js';
import { getSetting } from '../db/schema.js';

const router = Router();

// Nhả hold khi user mở ví
function maybeRelease() {
  try {
    releaseHeldOrders();
  } catch {
    /* ignore */
  }
}

router.get('/summary', requireAuth, (req, res) => {
  maybeRelease();
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const orderStats = db
    .prepare(
      `SELECT
         COUNT(*) as totalOrders,
         COALESCE(SUM(CASE WHEN status IN ('pending','completed','pending_review') THEN cashback_amount ELSE 0 END),0) as pendingCashback,
         COALESCE(SUM(CASE WHEN status = 'held' THEN cashback_amount ELSE 0 END),0) as heldCashback,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN cashback_amount ELSE 0 END),0) as paidCashback
       FROM orders WHERE user_id = ?`
    )
    .get(u.id);

  const refCount = db
    .prepare('SELECT COUNT(*) as c FROM users WHERE referred_by = ?')
    .get(u.id).c;

  const referralEarn = db
    .prepare(
      `SELECT COALESCE(SUM(amount),0) as total FROM wallet_transactions
       WHERE user_id = ? AND type IN ('referral_f1','referral_f2') AND status = 'completed'`
    )
    .get(u.id).total;

  res.json({
    balance: u.balance,
    pendingBalance: u.pending_balance,
    heldBalance: u.held_balance || 0,
    totalOrders: orderStats.totalOrders,
    paidCashback: orderStats.paidCashback,
    heldCashback: orderStats.heldCashback,
    referralCount: refCount,
    referralEarn,
    referralCode: u.referral_code,
    holdDays: parseInt(getSetting('hold_days', '7'), 10),
  });
});

router.get('/transactions', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM wallet_transactions WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 100`
    )
    .all(req.user.id);
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

router.get('/orders', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`
    )
    .all(req.user.id);
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

    const id = requestWithdraw(req.user.id, amt, method, paymentInfo);
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

router.get('/withdrawals', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM withdraw_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .all(req.user.id);
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

router.get('/referrals', requireAuth, (req, res) => {
  const f1 = db
    .prepare(
      `SELECT id, name, email, created_at,
        (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = users.id) as f2Count
       FROM users WHERE referred_by = ? ORDER BY created_at DESC`
    )
    .all(req.user.id);

  res.json({
    referralCode: req.user.referral_code,
    f1: f1.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
      f2Count: u.f2Count,
      joinedAt: u.created_at,
    })),
  });
});

// ---- Admin / Demo helpers ----

/** Demo: tạo đơn pending giả lập (khi chưa có Shopee API) */
router.post('/demo-order', requireAuth, (req, res) => {
  try {
    const amount = Number(req.body.orderAmount) || 250000;
    const commission = Number(req.body.commission) || Math.round(amount * 0.14);
    const share = parseFloat(process.env.CASHBACK_SHARE_RATIO || '0.70');
    const cashback = Math.round(commission * share);

    const order = recordPendingOrder({
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

/** Demo / Admin: xác nhận đơn → cộng tiền + F1/F2 */
router.post('/orders/:id/complete', requireAuth, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
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

    db.prepare(
      `UPDATE orders SET status = 'completed', complete_time = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(order.id);

    creditOrderCashback(order.id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    const user = db.prepare('SELECT balance, pending_balance FROM users WHERE id = ?').get(
      order.user_id
    );
    res.json({
      success: true,
      order: { id: updated.id, status: updated.status, cashbackAmount: updated.cashback_amount },
      balance: user.balance,
      pendingBalance: user.pending_balance,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/withdrawals/:id/process', requireAdmin, (req, res) => {
  const { status, note } = req.body; // approved | rejected | paid
  if (!['approved', 'rejected', 'paid'].includes(status)) {
    return res.status(400).json({ error: 'status không hợp lệ' });
  }
  const w = db.prepare('SELECT * FROM withdraw_requests WHERE id = ?').get(req.params.id);
  if (!w) return res.status(404).json({ error: 'Không tìm thấy' });

  const run = db.transaction(() => {
    if (status === 'rejected' && w.status === 'pending') {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(
        w.amount,
        w.user_id
      );
      const bal = db.prepare('SELECT balance FROM users WHERE id = ?').get(w.user_id)
        .balance;
      db.prepare(
        `INSERT INTO wallet_transactions
         (user_id, type, amount, balance_after, status, reference_type, reference_id, description)
         VALUES (?, 'adjust', ?, ?, 'completed', 'withdraw', ?, ?)`
      ).run(w.user_id, w.amount, bal, w.id, 'Hoàn tiền do từ chối rút');
    }
    db.prepare(
      `UPDATE withdraw_requests SET status = ?, admin_note = ?, processed_at = datetime('now') WHERE id = ?`
    ).run(status, note || null, w.id);
  });
  run();
  res.json({ success: true });
});

export default router;
