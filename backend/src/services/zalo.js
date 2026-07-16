/**
 * Zalo Official Account API helpers
 * Docs: https://developers.zalo.me/docs/api/official-account-api
 *
 * Cần:
 *  - ZALO_OA_ACCESS_TOKEN (token OA, refresh định kỳ trên Zalo Developers)
 *  - Webhook trỏ về: https://YOUR_DOMAIN/api/zalo/webhook
 */
import { getSetting } from '../db/schema.js';

export function isZaloEnabled() {
  return (
    getSetting('zalo_bot_enabled', '1') === '1' &&
    Boolean((getSetting('zalo_oa_access_token', '') || '').trim())
  );
}

function accessToken() {
  return (getSetting('zalo_oa_access_token', '') || process.env.ZALO_OA_ACCESS_TOKEN || '').trim();
}

/**
 * Gửi tin nhắn text tới user Zalo
 * API: POST https://openapi.zalo.me/v3.0/oa/message/cs
 */
export async function sendZaloText(zaloUserId, text) {
  const token = accessToken();
  if (!token) {
    return { ok: false, skipped: true, reason: 'Chưa cấu hình ZALO_OA_ACCESS_TOKEN' };
  }
  if (!zaloUserId) {
    return { ok: false, error: 'Thiếu zalo user id' };
  }

  const body = {
    recipient: { user_id: String(zaloUserId) },
    message: { text: String(text).slice(0, 2000) },
  };

  try {
    // v3 CS message
    let res = await fetch(
      `https://openapi.zalo.me/v3.0/oa/message/cs?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    let data = await res.json().catch(() => ({}));

    // fallback v2
    if (data.error && data.error !== 0) {
      res = await fetch(
        `https://openapi.zalo.me/v2.0/oa/message?access_token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { user_id: String(zaloUserId) },
            message: { text: String(text).slice(0, 2000) },
          }),
        }
      );
      data = await res.json().catch(() => ({}));
    }

    const ok = data.error === 0 || data.error === undefined && res.ok;
    if (!ok) {
      console.error('[zalo] send fail', data);
    }
    return { ok: Boolean(ok || data.message_id || data.data), data };
  } catch (e) {
    console.error('[zalo] send error', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Gửi tin nhắn kèm nút / link (promotion style đơn giản — text + URL)
 */
export async function sendZaloTextWithLink(zaloUserId, text, linkUrl) {
  const msg = linkUrl ? `${text}\n\n🔗 ${linkUrl}` : text;
  return sendZaloText(zaloUserId, msg);
}

/** Parse webhook body Zalo OA (nhiều version event) */
export function parseZaloWebhook(body) {
  if (!body || typeof body !== 'object') return null;

  // event_name style
  const eventName = body.event_name || body.event || body.eventname || '';
  const senderId =
    body.sender?.id ||
    body.message?.from_id ||
    body.from_id ||
    body.user_id_by_app ||
    null;

  let text =
    body.message?.text ||
    body.message?.message ||
    body.text ||
    body.message?.msg ||
    '';

  // attachment / link share
  if (!text && body.message?.attachments?.[0]) {
    const att = body.message.attachments[0];
    text = att.payload?.url || att.url || att.payload?.thumbnail || '';
  }

  // some payloads nest under data
  if (!text && body.data) {
    text = body.data.message?.text || body.data.text || '';
  }

  if (!senderId && !text && !eventName) return null;

  return {
    eventName: String(eventName),
    zaloUserId: senderId ? String(senderId) : null,
    text: String(text || '').trim(),
    raw: body,
  };
}
