import { Router } from 'express';
import { db, getAllSettings, setSetting, getSetting } from '../db/schema.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  approveOrderToHold,
  rejectOrder,
  releaseOneOrder,
  releaseHeldOrders,
} from '../services/wallet.js';
import { describeAffiliateSetup } from '../services/affiliate.js';
import {
  importAffiliateRows,
  importFromFile,
  previewExportText,
} from '../services/importOrders.js';
import { buildUserPayoutQr } from '../services/vietqr.js';
import { sendTelegram } from '../services/telegram.js';

const router = Router();
router.use(requireAdmin);

router.get('/stats', (_req, res) => {
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const orders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const pendingReview = db
    .prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'pending_review'`)
    .get().c;
  const held = db
    .prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'held'`)
    .get().c;
  const pendingWithdraw = db
    .prepare(`SELECT COUNT(*) as c FROM withdraw_requests WHERE status = 'pending'`)
    .get().c;
  const paidCashback = db
    .prepare(
      `SELECT COALESCE(SUM(cashback_amount),0) as s FROM orders WHERE status = 'paid'`
    )
    .get().s;
  const heldCashback = db
    .prepare(
      `SELECT COALESCE(SUM(cashback_amount),0) as s FROM orders WHERE status = 'held'`
    )
    .get().s;
  const clicks = db.prepare('SELECT COUNT(*) as c FROM click_logs').get().c;
  const gmv = db
    .prepare(
      `SELECT COALESCE(SUM(order_amount),0) as s FROM orders WHERE status IN ('held','paid','pending','pending_review')`
    )
    .get().s;
  const commissionEst = db
    .prepare(
      `SELECT COALESCE(SUM(total_commission),0) as s FROM orders WHERE status IN ('held','paid')`
    )
    .get().s;
  const byPlatform = db
    .prepare(
      `SELECT platform, COUNT(*) as c, COALESCE(SUM(cashback_amount),0) as cashback
       FROM orders GROUP BY platform`
    )
    .all();
  const last7 = db
    .prepare(
      `SELECT date(created_at) as d, COUNT(*) as orders, COALESCE(SUM(cashback_amount),0) as cashback
       FROM orders WHERE created_at >= datetime('now', '-7 days')
       GROUP BY date(created_at) ORDER BY d`
    )
    .all();

  res.json({
    users,
    orders,
    pendingReview,
    held,
    pendingWithdraw,
    paidCashback,
    heldCashback,
    clicks,
    gmv,
    commissionEst,
    byPlatform,
    last7,
    setup: describeAffiliateSetup(),
    holdDays: parseInt(getSetting('hold_days', '7'), 10),
  });
});

router.get('/settings', (_req, res) => {
  const s = getAllSettings();
  // hide full telegram token in UI optionally — still return for admin config
  res.json({ settings: s, setup: describeAffiliateSetup() });
});

router.put('/settings', (req, res) => {
  const allowed = [
    'cashback_share_ratio',
    'default_commission_rate',
    'f1_rate',
    'f2_rate',
    'min_withdraw',
    'site_name',
    'redirect_mode',
    'affiliate_wrapper',
    'shopee_affiliate_id',
    'auto_approve_claims',
    'claim_guide',
    'sub_id_format',
    'hold_days',
    'max_claims_per_day',
    'require_click_before_claim',
    'hard_block_no_click',
    'min_account_age_hours',
    'claim_click_window_days',
    'telegram_bot_token',
    'telegram_chat_id',
    'telegram_bot_enabled',
    'telegram_mode',
    'telegram_welcome',
    'admin_bank_bin',
    'admin_bank_account',
    'admin_bank_name',
    'admin_bank_holder',
    'support_zalo',
    'support_phone',
    'support_email',
    'enable_shopee',
    'enable_tiktok',
    'enable_lazada',
    'site_url',
    'zalo_oa_access_token',
    'zalo_oa_secret',
    'zalo_app_id',
    'zalo_webhook_verify',
    'zalo_bot_enabled',
    'zalo_welcome',
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) setSetting(key, req.body[key]);
  }
  res.json({ settings: getAllSettings(), success: true });
});

router.post('/telegram/test', async (_req, res) => {
  const r = await sendTelegram('✅ HoanTienVN: test Telegram OK');
  res.json(r);
});

router.get('/orders', (req, res) => {
  const status = req.query.status;
  let rows;
  if (status) {
    rows = db
      .prepare(
        `SELECT o.*, u.name as user_name, u.email as user_email
         FROM orders o JOIN users u ON u.id = o.user_id
         WHERE o.status = ?
         ORDER BY o.created_at DESC LIMIT 300`
      )
      .all(status);
  } else {
    rows = db
      .prepare(
        `SELECT o.*, u.name as user_name, u.email as user_email
         FROM orders o JOIN users u ON u.id = o.user_id
         ORDER BY o.created_at DESC LIMIT 300`
      )
      .all();
  }

  res.json({
    orders: rows.map((o) => {
      const clicks = db
        .prepare(
          `SELECT COUNT(*) as c FROM click_logs
           WHERE user_id = ? AND created_at >= datetime(?, '-14 days')`
        )
        .get(o.user_id, o.created_at || 'now').c;
      return {
        id: o.id,
        orderId: o.order_id,
        userId: o.user_id,
        userName: o.user_name,
        userEmail: o.user_email,
        platform: o.platform,
        productName: o.product_name,
        orderAmount: o.order_amount,
        cashbackAmount: o.cashback_amount,
        totalCommission: o.total_commission,
        status: o.status,
        source: o.source,
        claimNote: o.claim_note,
        adminNote: o.admin_note,
        fraudScore: o.fraud_score,
        fraudFlags: o.fraud_flags ? JSON.parse(o.fraud_flags) : [],
        holdUntil: o.hold_until,
        recentClicks: clicks,
        createdAt: o.created_at,
      };
    }),
  });
});

router.post('/orders/:id/approve', (req, res) => {
  try {
    const order = approveOrderToHold(req.params.id, req.body.note || 'Admin duyệt');
    res.json({
      success: true,
      status: order.status,
      holdUntil: order.hold_until,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/orders/:id/reject', (req, res) => {
  try {
    rejectOrder(req.params.id, req.body.note || 'Không khớp đối soát');
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/orders/:id/release', (req, res) => {
  try {
    const order = releaseOneOrder(req.params.id, { force: true });
    res.json({ success: true, status: order.status });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/hold/release-due', (_req, res) => {
  const r = releaseHeldOrders();
  res.json({ success: true, ...r });
});

router.get('/withdrawals', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT w.*, u.name as user_name, u.email as user_email
       FROM withdraw_requests w JOIN users u ON u.id = w.user_id
       ORDER BY w.created_at DESC LIMIT 100`
    )
    .all();
  res.json({
    withdrawals: rows.map((w) => ({
      id: w.id,
      userId: w.user_id,
      userName: w.user_name,
      userEmail: w.user_email,
      amount: w.amount,
      method: w.method,
      bankName: w.bank_name,
      bankAccount: w.bank_account,
      bankHolder: w.bank_holder,
      momoPhone: w.momo_phone,
      status: w.status,
      vietqrUrl: buildUserPayoutQr(w),
      createdAt: w.created_at,
    })),
  });
});

router.post('/withdrawals/:id/process', (req, res) => {
  const { status, note } = req.body;
  if (!['approved', 'rejected', 'paid'].includes(status)) {
    return res.status(400).json({ error: 'status: approved | rejected | paid' });
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

/** Preview CSV Shopee trước khi import */
router.post('/import-preview', (req, res) => {
  try {
    const csv = req.body.csv;
    if (typeof csv !== 'string' || !csv.trim()) {
      return res.status(400).json({ error: 'Dán nội dung CSV (AffiliateCommissionReport)' });
    }
    const preview = previewExportText(csv);
    res.json({ success: true, ...preview });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Import CSV báo cáo Shopee Aff
 * Body: { csv: string } hoặc { filePath: "C:\\...\\AffiliateCommissionReport_....csv" }
 *        hoặc { orders: [...] }
 */
router.post('/import-orders', (req, res) => {
  try {
    const opts = {
      autoHold: req.body.autoHold !== false && req.body.autoCredit !== false,
      onlyCompleted: req.body.onlyCompleted !== false,
    };

    let result;
    if (typeof req.body.filePath === 'string' && req.body.filePath.trim()) {
      result = importFromFile(req.body.filePath.trim(), opts);
    } else if (typeof req.body.csv === 'string' && req.body.csv.trim()) {
      result = importAffiliateRows(req.body.csv, opts);
    } else if (Array.isArray(req.body.orders) && req.body.orders.length) {
      result = importAffiliateRows(req.body.orders, opts);
    } else {
      return res.status(400).json({
        error: 'Gửi csv (text), filePath, hoặc orders[]',
        hint: 'File Shopee: AffiliateCommissionReport_*.csv (UTF-8)',
      });
    }

    res.json({ success: true, ...result });
  } catch (e) {
    console.error('import-orders', e);
    res.status(400).json({ error: e.message });
  }
});

router.get('/clicks', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, u.name as user_name, l.product_name, l.short_code, l.sub_id
       FROM click_logs c
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN cashback_links l ON l.id = c.link_id
       ORDER BY c.created_at DESC LIMIT 150`
    )
    .all();
  res.json({
    clicks: rows.map((c) => ({
      id: c.id,
      userName: c.user_name,
      productName: c.product_name,
      shortCode: c.short_code,
      subId: c.sub_id,
      platform: c.platform,
      ip: c.ip,
      createdAt: c.created_at,
    })),
  });
});

router.get('/users', (_req, res) => {
  const users = db
    .prepare(
      `SELECT id, email, name, role, status, balance, pending_balance, held_balance,
              referral_code, created_at FROM users ORDER BY id DESC LIMIT 200`
    )
    .all();
  res.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      balance: u.balance,
      pendingBalance: u.pending_balance,
      heldBalance: u.held_balance,
      referralCode: u.referral_code,
      createdAt: u.created_at,
    })),
  });
});

router.post('/users/:id/ban', (req, res) => {
  const status = req.body.status === 'active' ? 'active' : 'banned';
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true, status });
});

export default router;
