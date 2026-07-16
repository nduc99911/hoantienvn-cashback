/**
 * Zalo bot — optional (cần Zalo OA).
 * Stub an toàn khi không dùng OA.
 */
import { customAlphabet } from 'nanoid';
import { one, run, getSetting } from '../db/schema.js';
import { sendZaloText } from './zalo.js';

const genBind = customAlphabet('0123456789', 6);

export async function handleZaloMessage({ zaloUserId, text }) {
  if (!zaloUserId) return null;
  if (!text) return 'Gửi link Shopee hoặc MENU (cần cấu hình Zalo OA).';
  return (
    getSetting('zalo_welcome', '') ||
    'Bot Zalo cần Official Account. Dùng Telegram: t.me/hoantienvn_shopee_bot'
  );
}

export async function processAndReply({ zaloUserId, text, eventName }) {
  const reply = await handleZaloMessage({ zaloUserId, text, eventName });
  if (reply && zaloUserId) await sendZaloText(zaloUserId, reply);
  return reply;
}

export async function createBindCode(userId) {
  let code = genBind();
  while (await one('SELECT id FROM users WHERE zalo_bind_code = ?', [code])) {
    code = genBind();
  }
  await run('UPDATE users SET zalo_bind_code = ? WHERE id = ?', [code, userId]);
  return code;
}
