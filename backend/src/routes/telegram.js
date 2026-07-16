import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSetting, one, many, run } from '../db/schema.js';
import {
  isTelegramBotEnabled,
  getMe,
  sendTelegramTo,
  getTelegramToken,
} from '../services/telegram.js';
import {
  processTelegramWebhook,
  createTelegramBindCode,
} from '../services/telegramBot.js';
import { generateSubId } from '../services/affiliate.js';

const router = Router();

/** Webhook (production HTTPS) */
router.post('/webhook', async (req, res) => {
  res.status(200).json({ ok: true });
  if (getSetting('telegram_bot_enabled', '1') === '0') return;
  try {
    await processTelegramWebhook(req.body);
  } catch (e) {
    console.error('[tg] webhook', e);
  }
});

router.get('/status', async (_req, res) => {
  const me = await getMe();
  res.json({
    enabled: isTelegramBotEnabled(),
    hasToken: Boolean(getTelegramToken()),
    mode: getSetting('telegram_mode', process.env.TELEGRAM_MODE || 'polling'),
    bot: me
      ? { id: me.id, username: me.username, name: me.first_name }
      : null,
    deepLink: me?.username ? `https://t.me/${me.username}` : null,
  });
});

router.post('/bind-code', requireAuth, async (req, res) => {
  const code = createTelegramBindCode(req.user.id);
  res.json({
    code,
    instruction: `Mở bot Telegram → gõ: /lienket ${code}`,
  });
});

router.get('/bind-status', requireAuth, async (req, res) => {
  const u = await one('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({
    linked: Boolean(u.telegram_id),
    telegramId: u.telegram_id || null,
    telegramName: u.telegram_name || null,
    bindCode: u.telegram_bind_code || null,
    affSubId: generateSubId(u),
    botEnabled: isTelegramBotEnabled(),
  });
});

router.post('/test', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const chatId = req.body.chatId || getSetting('telegram_chat_id', '');
  if (!chatId) {
    return res.status(400).json({ error: 'Cần chatId hoặc cấu hình telegram_chat_id' });
  }
  const r = await sendTelegramTo(
    chatId,
    req.body.text || '✅ Test bot HoanTienVN OK'
  );
  res.json(r);
});

router.get('/linked-users', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const rows = await many(
    `SELECT id, name, email, telegram_id, telegram_name, balance, referral_code
     FROM users WHERE telegram_id IS NOT NULL AND telegram_id != ''
     ORDER BY id DESC LIMIT 100`
  );
  res.json({
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      telegramId: u.telegram_id,
      telegramName: u.telegram_name,
      balance: u.balance,
      affSubId: generateSubId(u),
    })),
  });
});

export default router;
