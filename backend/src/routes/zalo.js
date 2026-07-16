import { Router } from 'express';
import { parseZaloWebhook, sendZaloText, isZaloEnabled } from '../services/zalo.js';
import { processAndReply, createBindCode } from '../services/zaloBot.js';
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

/** User web: tạo mã liên kết Zalo */
router.post('/bind-code', requireAuth, async (req, res) => {
  const code = createBindCode(req.user.id);
  res.json({
    code,
    instruction: `Mở Zalo OA → nhắn: LIENKET ${code}`,
    expiresNote: 'Dùng 1 lần. Tạo lại nếu cần.',
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
  const r = await sendZaloText(
    zaloUserId,
    text || '✅ Test bot HoanTienVN OK'
  );
  res.json(r);
});

/** Admin: xem user đã gắn Zalo */
router.get('/linked-users', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const rows = /*FIXME db.prepare*/await run(
      `SELECT id, name, email, zalo_id, zalo_name, balance, referral_code
       FROM users WHERE zalo_id IS NOT NULL AND zalo_id != ''
       ORDER BY id DESC LIMIT 100`
    )
    .all();
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
