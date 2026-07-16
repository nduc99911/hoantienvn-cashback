import { Router } from 'express';
import { parseZaloWebhook, sendZaloText, isZaloEnabled } from '../services/zalo.js';
import { processAndReply, createBindCode } from '../services/zaloBot.js';
import {
  zcaStatus,
  isZcaOnline,
  sendZcaText,
  startZcaPersonal,
  stopZcaPersonal,
} from '../services/zcaPersonal.js';
import { requireAuth } from '../middleware/auth.js';
import { generateSubId } from '../services/affiliate.js';
import { getSetting, one, many, run } from '../db/schema.js';

const router = Router();

/**
 * Zalo webhook verification (một số setup dùng GET)
 * GET /api/zalo/webhook?verify=xxx
 */
router.get('/webhook', async (req, res) => {
  const expected = getSetting('zalo_webhook_verify', 'hoantienvn');
  const q = req.query.verify || req.query.challenge || req.query.code;
  if (q && String(q) === String(expected)) {
    return res.status(200).send(q);
  }
  // Zalo đôi khi chỉ cần 200
  res.status(200).json({
    ok: true,
    service: 'HoanTienVN Zalo Bot',
    enabled: isZaloEnabled(),
  });
});

/**
 * Nhận event từ Zalo OA
 * POST /api/zalo/webhook
 */
router.post('/webhook', async (req, res) => {
  // Trả 200 ngay để Zalo không retry (xử lý async)
  res.status(200).json({ ok: true });

  try {
    if (getSetting('zalo_bot_enabled', '1') !== '1') return;

    const parsed = parseZaloWebhook(req.body);
    if (!parsed) {
      console.log('[zalo] webhook ignore (empty parse)', JSON.stringify(req.body)?.slice(0, 200));
      return;
    }

    console.log(
      `[zalo] event=${parsed.eventName} from=${parsed.zaloUserId} text=${(parsed.text || '').slice(0, 80)}`
    );

    await processAndReply({
      zaloUserId: parsed.zaloUserId,
      text: parsed.text,
      eventName: parsed.eventName,
    });
  } catch (e) {
    console.error('[zalo] webhook error', e);
  }
});

/** Trạng thái Zalo personal (zca-js) — public light */
router.get('/personal/status', (_req, res) => {
  const s = zcaStatus();
  res.json({
    enabled: s.enabled,
    online: s.online,
    allowGroup: s.allowGroup,
    hasCredentials: s.hasCredentials,
    warning: s.warning,
  });
});

/** Admin: chi tiết + restart listener */
router.get('/personal/admin-status', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  res.json(zcaStatus());
});

router.post('/personal/restart', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  stopZcaPersonal();
  const api = await startZcaPersonal();
  res.json({ ok: Boolean(api), status: zcaStatus() });
});

/** User web: tạo mã liên kết Zalo */
router.post('/bind-code', requireAuth, async (req, res) => {
  const code = await createBindCode(req.user.id);
  const viaPersonal = isZcaOnline();
  res.json({
    code,
    instruction: viaPersonal
      ? `Nhắn Zalo (acc bot personal) → lienket ${code}`
      : `Mở Zalo OA / acc support → nhắn: lienket ${code}`,
    expiresNote: 'Dùng 1 lần. Tạo lại nếu cần.',
    personalOnline: viaPersonal,
  });
});

/** User web: trạng thái liên kết */
router.get('/bind-status', requireAuth, async (req, res) => {
  const u = await one('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({
    linked: Boolean(u.zalo_id),
    zaloId: u.zalo_id ? `${String(u.zalo_id).slice(0, 4)}***` : null,
    zaloName: u.zalo_name || null,
    bindCode: u.zalo_bind_code || null,
    affSubId: generateSubId(u),
    botEnabled: isZaloEnabled(),
    personalOnline: isZcaOnline(),
  });
});

/** Admin: test gửi tin Zalo */
router.post('/test', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const { zaloUserId, text } = req.body;
  if (!zaloUserId) {
    return res.status(400).json({ error: 'Cần zaloUserId (user id trên Zalo OA)' });
  }
  const msg = text || '✅ Test bot HoanTienVN OK';
  let r;
  if (isZcaOnline()) {
    r = await sendZcaText(zaloUserId, msg);
    r = { ...r, via: 'zca_personal' };
  } else {
    r = await sendZaloText(zaloUserId, msg);
    r = { ...r, via: 'oa' };
  }
  res.json(r);
});

/** Admin: xem user đã gắn Zalo */
router.get('/linked-users', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const rows = await many(
    `SELECT id, name, email, zalo_id, zalo_name, balance, referral_code
     FROM users WHERE zalo_id IS NOT NULL AND zalo_id != ''
     ORDER BY id DESC LIMIT 100`
  );
  res.json({
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      zaloId: u.zalo_id,
      zaloName: u.zalo_name,
      balance: u.balance,
      affSubId: generateSubId(u),
    })),
  });
});

export default router;
