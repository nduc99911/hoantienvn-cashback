/**
 * Telegram Bot API
 * - Admin notify (chat_id cố định)
 * - User bot (chat_id = từng user)
 */
import { getSetting } from '../db/schema.js';

export function getTelegramToken() {
  return (
    getSetting('telegram_bot_token', '') ||
    process.env.TELEGRAM_BOT_TOKEN ||
    ''
  ).trim();
}

export function isTelegramBotEnabled() {
  const enabled = getSetting('telegram_bot_enabled', '1') !== '0';
  return enabled && Boolean(getTelegramToken());
}

async function tgApi(method, body) {
  const token = getTelegramToken();
  if (!token) return { ok: false, skipped: true, reason: 'Chưa có TELEGRAM_BOT_TOKEN' };

  const url = `https://api.telegram.org/bot${token}/${method}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return data;
  } catch (e) {
    console.error('[tg]', method, e.message);
    return { ok: false, error: e.message };
  }
}

/** Gửi tin tới 1 chat (user hoặc group admin) */
export async function sendTelegramTo(chatId, text, extra = {}) {
  if (!chatId) return { ok: false, error: 'Thiếu chatId' };
  const data = await tgApi('sendMessage', {
    chat_id: chatId,
    text: String(text).slice(0, 4000),
    disable_web_page_preview: true,
    ...extra,
  });
  return { ok: Boolean(data.ok), data };
}

/** Notify admin (chat_id cấu hình) */
export async function sendTelegram(text) {
  const chatId = (
    getSetting('telegram_chat_id', '') ||
    process.env.TELEGRAM_CHAT_ID ||
    ''
  ).trim();
  if (!getTelegramToken() || !chatId) {
    return { ok: false, skipped: true, reason: 'Telegram admin chưa cấu hình' };
  }
  return sendTelegramTo(chatId, text);
}

export function notifyNewClaim(payload) {
  const lines = [
    '🧾 CLAIM / BÁO ĐƠN',
    `User: ${payload.userName} (#${payload.userId})`,
    `Mã đơn: ${payload.orderId}`,
    `Giá trị: ${Number(payload.orderAmount || 0).toLocaleString('vi-VN')}đ`,
    `Hoàn: ${Number(payload.cashbackAmount || 0).toLocaleString('vi-VN')}đ`,
    `Fraud: ${payload.fraudScore || 0}`,
  ];
  return sendTelegram(lines.join('\n'));
}

export function notifyWithdraw(payload) {
  const lines = [
    '💸 YÊU CẦU RÚT TIỀN',
    `User: ${payload.userName} (#${payload.userId})`,
    `Số tiền: ${Number(payload.amount).toLocaleString('vi-VN')}đ`,
    `PT: ${payload.method}`,
    payload.method === 'bank'
      ? `${payload.bankName} · ${payload.bankAccount} · ${payload.bankHolder}`
      : `MoMo: ${payload.momoPhone}`,
  ];
  return sendTelegram(lines.join('\n'));
}

export function notifyHoldReleased(count, totalAmount) {
  return sendTelegram(
    `✅ HOLD RELEASE\n${count} đơn → ví\nTổng: ${Number(totalAmount).toLocaleString('vi-VN')}đ`
  );
}

export async function getMe() {
  const token = getTelegramToken();
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    return data.ok ? data.result : null;
  } catch {
    return null;
  }
}

export async function getUpdates(offset) {
  const token = getTelegramToken();
  if (!token) return [];
  try {
    const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
    url.searchParams.set('timeout', '25');
    url.searchParams.set('allowed_updates', JSON.stringify(['message']));
    if (offset) url.searchParams.set('offset', String(offset));
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(35000) });
    const data = await res.json();
    return data.ok ? data.result || [] : [];
  } catch (e) {
    if (e.name !== 'TimeoutError' && e.name !== 'AbortError') {
      console.error('[tg] getUpdates', e.message);
    }
    return [];
  }
}

export { tgApi };
