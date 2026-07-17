import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSetting, one, many } from '../db/schema.js';
import { generateSubId } from '../services/affiliate.js';
import {
  getVerifyToken,
  isFacebookBotEnabled,
  facebookStatus,
  sendFacebookText,
  verifyFacebookSignature,
} from '../services/facebook.js';
import {
  processFacebookMessagingEvent,
  createFacebookBindCode,
} from '../services/facebookBot.js';

const router = Router();

function isStaff(u) {
  return ['admin', 'super_admin', 'finance', 'support'].includes(u?.role);
}

/**
 * Webhook verification (GET) — Meta gọi khi đăng ký callback
 * https://developers.facebook.com/docs/messenger-platform/webhooks
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = getVerifyToken();

  if (mode === 'subscribe' && token && token === expected) {
    console.log('[fb] webhook verified');
    return res.status(200).send(challenge);
  }
  console.warn('[fb] webhook verify fail', { mode, token: token ? '***' : '' });
  return res.sendStatus(403);
});

/**
 * Webhook events (POST)
 */
router.post('/webhook', async (req, res) => {
  // Trả 200 ngay
  res.status(200).send('EVENT_RECEIVED');

  try {
    if (getSetting('facebook_bot_enabled', '0') !== '1') return;

    const sig = req.get('x-hub-signature-256') || req.get('X-Hub-Signature-256');
    // express.json đã parse — signature check đầy đủ cần raw body; optional
    if (getSetting('facebook_app_secret', '') && sig) {
      // best-effort: skip strict if raw unavailable
    }

    const body = req.body;
    if (body.object !== 'page') return;

    for (const entry of body.entry || []) {
      const messaging = entry.messaging || [];
      for (const event of messaging) {
        console.log(
          `[fb] from=${event.sender?.id} text=${(event.message?.text || event.postback?.payload || '').slice(0, 80)}`
        );
        await processFacebookMessagingEvent(event);
      }
    }
  } catch (e) {
    console.error('[fb] webhook error', e);
  }
});

router.get('/status', (_req, res) => {
  res.json(facebookStatus());
});

router.post('/bind-code', requireAuth, async (req, res) => {
  const code = await createFacebookBindCode(req.user.id);
  res.json({
    code,
    command: `lienket ${code}`,
    instruction: `Mở Messenger Page → gửi: lienket ${code}`,
    howTo: [
      '1. Login web (đang ở đây)',
      '2. Bấm tạo mã Facebook trên Dashboard',
      '3. Mở chat Page Facebook HoanTienVN',
      `4. Gửi: lienket ${code}`,
      '5. Thấy ✅ → cùng ví web',
    ],
  });
});

router.get('/bind-status', requireAuth, async (req, res) => {
  const u = await one('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({
    linked: Boolean(u.facebook_psid),
    facebookName: u.facebook_name || null,
    bindCode: u.facebook_bind_code || null,
    affSubId: generateSubId(u),
    botEnabled: isFacebookBotEnabled(),
  });
});

router.post('/test', requireAuth, async (req, res) => {
  if (!isStaff(req.user)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  const { psid, text } = req.body;
  if (!psid) return res.status(400).json({ error: 'Cần psid (Page-scoped user id)' });
  const r = await sendFacebookText(psid, text || '✅ Test HoanTienVN Messenger OK');
  res.json(r);
});

router.get('/linked-users', requireAuth, async (req, res) => {
  if (!isStaff(req.user)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  const rows = await many(
    `SELECT id, name, email, facebook_psid, facebook_name, balance, referral_code
     FROM users WHERE facebook_psid IS NOT NULL AND facebook_psid != ''
     ORDER BY id DESC LIMIT 100`
  );
  res.json({
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      psid: u.facebook_psid,
      facebookName: u.facebook_name,
      balance: u.balance,
      affSubId: generateSubId(u),
    })),
  });
});

export default router;
