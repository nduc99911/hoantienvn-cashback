import { Router } from 'express';
import {
  getAllSettings,
  setSetting,
  getSetting,
  one,
  many,
  run,
  withTransaction,
  sqlNow,
  sqlNowMinusDays,
  isPostgres,
} from '../db/schema.js';
import { requireAdmin, requirePermission } from '../middleware/auth.js';
import {
  canAssignRole,
  isStaffRole,
  listPermissions,
  ROLES,
  ROLE_PERMISSIONS,
} from '../services/rbac.js';
import {
  createCampaign,
  listCampaigns,
  sendCampaign,
  getAudienceEmails,
} from '../services/marketing.js';
import { emailProviderInfo, sendEmail, isEmailConfigured } from '../services/email.js';
import { isSmsConfigured } from '../services/sms.js';
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

router.get('/stats', async (_req, res) => {
  try {
    const users = Number((await one('SELECT COUNT(*) as c FROM users'))?.c || 0);
    const orders = Number((await one('SELECT COUNT(*) as c FROM orders'))?.c || 0);
    const pendingReview = Number(
      (await one(`SELECT COUNT(*) as c FROM orders WHERE status = 'pending_review'`))?.c || 0
    );
    const held = Number(
      (await one(`SELECT COUNT(*) as c FROM orders WHERE status = 'held'`))?.c || 0
    );
    const pendingWithdraw = Number(
      (await one(`SELECT COUNT(*) as c FROM withdraw_requests WHERE status = 'pending'`))
        ?.c || 0
    );
    const paidCashback = Number(
      (
        await one(
          `SELECT COALESCE(SUM(cashback_amount),0) as s FROM orders WHERE status = 'paid'`
        )
      )?.s || 0
    );
    const heldCashback = Number(
      (
        await one(
          `SELECT COALESCE(SUM(cashback_amount),0) as s FROM orders WHERE status = 'held'`
        )
      )?.s || 0
    );
    const clicks = Number(
      (await one('SELECT COUNT(*) as c FROM click_logs'))?.c || 0
    );
    const gmv = Number(
      (
        await one(
          `SELECT COALESCE(SUM(order_amount),0) as s FROM orders WHERE status IN ('held','paid','pending','pending_review')`
        )
      )?.s || 0
    );
    const commissionEst = Number(
      (
        await one(
          `SELECT COALESCE(SUM(total_commission),0) as s FROM orders WHERE status IN ('held','paid')`
        )
      )?.s || 0
    );
    const byPlatform = await many(
      `SELECT platform, COUNT(*) as c, COALESCE(SUM(cashback_amount),0) as cashback
       FROM orders GROUP BY platform`
    );
    const last7Sql = isPostgres
      ? `SELECT to_char(created_at, 'YYYY-MM-DD') as d, COUNT(*) as orders, COALESCE(SUM(cashback_amount),0) as cashback
         FROM orders WHERE created_at >= ${sqlNowMinusDays(7)}
         GROUP BY to_char(created_at, 'YYYY-MM-DD') ORDER BY d`
      : `SELECT date(created_at) as d, COUNT(*) as orders, COALESCE(SUM(cashback_amount),0) as cashback
         FROM orders WHERE created_at >= datetime('now', '-7 days')
         GROUP BY date(created_at) ORDER BY d`;
    const last7 = await many(last7Sql);

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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/settings', async (_req, res) => {
  const s = await getAllSettings();
  res.json({ settings: s, setup: describeAffiliateSetup() });
});

router.put('/settings', async (req, res) => {
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
    'support_zalo_group',
    'support_telegram',
    'support_telegram_bot',
    'support_phone',
    'support_email',
    'support_facebook',
    'support_messenger',
    'guide_video_url',
    'google_client_id',
    'enable_shopee',
    'enable_tiktok',
    'enable_lazada',
    'site_url',
    'gsc_verification',
    'admin_momo_phone',
    'f1_rate',
    'f2_rate',
    'zalo_oa_access_token',
    'zalo_oa_secret',
    'zalo_app_id',
    'zalo_webhook_verify',
    'zalo_bot_enabled',
    'zalo_welcome',
    'zalo_personal_enabled',
    'zalo_personal_allow_group',
    'demo_mode_enabled',
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) await setSetting(key, req.body[key]);
  }

  // Áp dụng bật/tắt Zalo personal ngay sau khi lưu
  let zca = null;
  try {
    const { applyZcaFromSettings } = await import('../services/zcaPersonal.js');
    zca = await applyZcaFromSettings();
  } catch (e) {
    zca = { ok: false, error: e.message };
  }

  res.json({
    settings: await getAllSettings(),
    success: true,
    zca,
  });
});

/** Admin: trạng thái + bật/tắt nhanh Zalo personal */
router.get('/zalo-personal/status', async (_req, res) => {
  try {
    const { zcaStatus } = await import('../services/zcaPersonal.js');
    res.json(zcaStatus());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/zalo-personal/toggle', async (req, res) => {
  try {
    const { zcaStatus, stopZcaPersonal, startZcaPersonal } = await import(
      '../services/zcaPersonal.js'
    );

    const enabled =
      req.body?.enabled === true ||
      req.body?.enabled === 1 ||
      req.body?.enabled === '1';
    await setSetting('zalo_personal_enabled', enabled ? '1' : '0');

    if (req.body?.allowGroup !== undefined) {
      const g =
        req.body.allowGroup === true ||
        req.body.allowGroup === 1 ||
        req.body.allowGroup === '1';
      await setSetting('zalo_personal_allow_group', g ? '1' : '0');
    }
    if (req.body?.welcome !== undefined) {
      await setSetting('zalo_welcome', String(req.body.welcome || ''));
    }

    let action;
    if (!enabled) {
      stopZcaPersonal();
      action = 'stopped';
    } else {
      stopZcaPersonal();
      const api = await startZcaPersonal();
      action = api ? 'started' : 'start_failed';
    }

    res.json({
      ok: true,
      action,
      zalo_personal_enabled: getSetting('zalo_personal_enabled', '0'),
      zalo_personal_allow_group: getSetting('zalo_personal_allow_group', '0'),
      status: zcaStatus(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/zalo-personal/restart', async (_req, res) => {
  try {
    const { stopZcaPersonal, startZcaPersonal, zcaStatus } = await import(
      '../services/zcaPersonal.js'
    );
    stopZcaPersonal();
    const api = await startZcaPersonal();
    res.json({ ok: Boolean(api), status: zcaStatus() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post(
  '/telegram/test',
  requirePermission('telegram.use'),
  async (_req, res) => {
    const r = await sendTelegram('✅ HoanTienVN: test Telegram OK');
    res.json(r);
  }
);

/** Email / SMS status + test */
router.get('/comms/status', async (_req, res) => {
  res.json({
    email: emailProviderInfo(),
    sms: {
      configured: isSmsConfigured(),
      provider: process.env.SMS_PROVIDER || 'mock',
    },
  });
});

router.post(
  '/email/test',
  requirePermission('email.test'),
  async (req, res) => {
    try {
      if (!isEmailConfigured()) {
        return res.status(400).json({
          error:
            'Chưa cấu hình email. Set RESEND_API_KEY hoặc SMTP_HOST/USER/PASS trên Render.',
        });
      }
      const to = req.body?.to || req.user.email;
      const r = await sendEmail({
        to,
        subject: 'HoanTienVN — test email',
        text: 'Email SMTP/Resend hoạt động OK.',
        html: '<p><b>HoanTienVN</b> — test email OK.</p>',
      });
      res.json(r);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

/** Marketing */
router.get(
  '/marketing/campaigns',
  requirePermission('marketing.read'),
  async (_req, res) => {
    const campaigns = await listCampaigns();
    const audience = await getAudienceEmails('opted_in');
    res.json({ campaigns, optedInCount: audience.length });
  }
);

router.post(
  '/marketing/campaigns',
  requirePermission('marketing.send'),
  async (req, res) => {
    try {
      const c = await createCampaign({
        subject: req.body.subject,
        bodyHtml: req.body.bodyHtml,
        bodyText: req.body.bodyText,
        audience: req.body.audience || 'opted_in',
        createdBy: req.user.id,
      });
      res.json({ campaign: c });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

router.post(
  '/marketing/campaigns/:id/send',
  requirePermission('marketing.send'),
  async (req, res) => {
    try {
      const r = await sendCampaign(Number(req.params.id));
      res.json(r);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

/** Staff / RBAC */
router.get('/rbac', async (req, res) => {
  res.json({
    roles: ROLES,
    permissions: ROLE_PERMISSIONS,
    me: {
      role: req.user.role,
      permissions: listPermissions(req.user.role),
    },
  });
});

router.get('/staff', requirePermission('staff.read'), async (_req, res) => {
  const rows = await many(
    `SELECT id, email, name, role, status, created_at FROM users
     WHERE role IN ('super_admin','admin','finance','support')
     ORDER BY id`
  );
  res.json({ staff: rows });
});

router.post(
  '/users/:id/role',
  requirePermission('users.role'),
  async (req, res) => {
    try {
      const role = String(req.body.role || '').trim();
      if (!ROLES.includes(role)) {
        return res.status(400).json({ error: `role hợp lệ: ${ROLES.join(', ')}` });
      }
      if (!canAssignRole(req.user.role, role)) {
        return res.status(403).json({ error: 'Không được gán role này' });
      }
      const target = await one('SELECT * FROM users WHERE id = ?', [
        req.params.id,
      ]);
      if (!target) return res.status(404).json({ error: 'User không tồn tại' });
      if (
        target.role === 'super_admin' &&
        req.user.role !== 'super_admin'
      ) {
        return res.status(403).json({ error: 'Không đổi super_admin' });
      }
      if (Number(target.id) === Number(req.user.id) && role === 'user') {
        return res.status(400).json({ error: 'Không tự hạ quyền chính mình' });
      }
      await run('UPDATE users SET role = ? WHERE id = ?', [role, target.id]);
      res.json({ success: true, id: target.id, role });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

/** Ops checklist (static) */
router.get('/ops/checklist', async (_req, res) => {
  res.json({
    title: 'Quy trình vận hành hàng ngày/tuần',
    steps: [
      {
        n: 1,
        title: 'Export CSV Shopee Affiliate',
        detail:
          'Portal affiliate.shopee.vn → Báo cáo hoa hồng → Tải AffiliateCommissionReport_*.csv (UTF-8)',
      },
      {
        n: 2,
        title: 'Import CSV trên Admin',
        detail:
          'Tab Import CSV → dán nội dung file → Preview → Import (auto hold). Kiểm tra Sub_id1 map user (U{id}_{code}).',
      },
      {
        n: 3,
        title: 'Duyệt / hold / nhả ví',
        detail:
          'Tab Đơn: duyệt claim (nếu có). Import thường auto-hold. Tab KPI → Nhả hold đến hạn hoặc nhả tay.',
      },
      {
        n: 4,
        title: 'Xử lý rút tiền',
        detail:
          'Tab Rút tiền: xem VietQR STK **user** (admin quét chuyển cho user) → Đã chuyển / Từ chối. STK admin chỉ fallback khi thiếu BIN user.',
      },
      {
        n: 5,
        title: 'Đối soát & hỗ trợ',
        detail:
          'Telegram notify, ban user spam, kiểm tra clicks. Backup Supabase chạy tự động (GitHub Actions).',
      },
    ],
  });
});

router.get('/orders', async (req, res) => {
  try {
    const status = req.query.status;
    let rows;
    if (status) {
      rows = await many(
        `SELECT o.*, u.name as user_name, u.email as user_email
         FROM orders o JOIN users u ON u.id = o.user_id
         WHERE o.status = ?
         ORDER BY o.created_at DESC LIMIT 300`,
        [status]
      );
    } else {
      rows = await many(
        `SELECT o.*, u.name as user_name, u.email as user_email
         FROM orders o JOIN users u ON u.id = o.user_id
         ORDER BY o.created_at DESC LIMIT 300`
      );
    }

    const orders = [];
    for (const o of rows) {
      const clicks = await one(
        `SELECT COUNT(*) as c FROM click_logs
         WHERE user_id = ? AND created_at >= ${sqlNowMinusDays(14)}`,
        [o.user_id]
      );
      let fraudFlags = [];
      try {
        fraudFlags = o.fraud_flags ? JSON.parse(o.fraud_flags) : [];
      } catch {
        fraudFlags = [];
      }
      orders.push({
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
        fraudFlags,
        holdUntil: o.hold_until,
        recentClicks: Number(clicks?.c || 0),
        createdAt: o.created_at,
      });
    }
    res.json({ orders });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/orders/:id/approve', async (req, res) => {
  try {
    const order = await approveOrderToHold(
      req.params.id,
      req.body.note || 'Admin duyệt'
    );
    res.json({
      success: true,
      status: order.status,
      holdUntil: order.hold_until,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/orders/:id/reject', async (req, res) => {
  try {
    await rejectOrder(req.params.id, req.body.note || 'Không khớp đối soát');
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/orders/:id/release', async (req, res) => {
  try {
    const order = await releaseOneOrder(req.params.id, { force: true });
    res.json({ success: true, status: order.status });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/hold/release-due', async (_req, res) => {
  const r = await releaseHeldOrders();
  res.json({ success: true, ...r });
});

router.get('/withdrawals', async (_req, res) => {
  const rows = await many(
    `SELECT w.*, u.name as user_name, u.email as user_email
     FROM withdraw_requests w JOIN users u ON u.id = w.user_id
     ORDER BY w.created_at DESC LIMIT 100`
  );
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

router.post('/withdrawals/:id/process', async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'status: approved | rejected | paid' });
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

router.post('/import-preview', async (req, res) => {
  try {
    const csv = req.body.csv;
    if (typeof csv !== 'string' || !csv.trim()) {
      return res
        .status(400)
        .json({ error: 'Dán nội dung CSV (AffiliateCommissionReport)' });
    }
    const preview = previewExportText(csv);
    res.json({ success: true, ...preview });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/import-orders', async (req, res) => {
  try {
    const opts = {
      autoHold: req.body.autoHold !== false && req.body.autoCredit !== false,
      onlyCompleted: req.body.onlyCompleted !== false,
    };

    let result;
    if (typeof req.body.filePath === 'string' && req.body.filePath.trim()) {
      result = await importFromFile(req.body.filePath.trim(), opts);
    } else if (typeof req.body.csv === 'string' && req.body.csv.trim()) {
      result = await importAffiliateRows(req.body.csv, opts);
    } else if (Array.isArray(req.body.orders) && req.body.orders.length) {
      result = await importAffiliateRows(req.body.orders, opts);
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

router.get('/clicks', async (_req, res) => {
  const rows = await many(
    `SELECT c.*, u.name as user_name, l.product_name, l.short_code, l.sub_id
     FROM click_logs c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN cashback_links l ON l.id = c.link_id
     ORDER BY c.created_at DESC LIMIT 150`
  );
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

router.get('/users', async (_req, res) => {
  const users = await many(
    `SELECT id, email, name, role, status, balance, pending_balance, held_balance,
            referral_code, created_at FROM users ORDER BY id DESC LIMIT 200`
  );
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

router.post(
  '/users/:id/ban',
  requirePermission('users.ban'),
  async (req, res) => {
    const status = req.body.status === 'active' ? 'active' : 'banned';
    const target = await one('SELECT role FROM users WHERE id = ?', [
      req.params.id,
    ]);
    if (target?.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Không ban super_admin' });
    }
    await run('UPDATE users SET status = ? WHERE id = ?', [
      status,
      req.params.id,
    ]);
    res.json({ success: true, status });
  }
);

export default router;
