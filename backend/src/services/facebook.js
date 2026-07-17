/**
 * Facebook Messenger (Page) — API chính thức Meta
 * Docs: https://developers.facebook.com/docs/messenger-platform
 *
 * Env / Admin settings:
 *  - FACEBOOK_PAGE_ACCESS_TOKEN / facebook_page_token
 *  - FACEBOOK_VERIFY_TOKEN / facebook_verify_token  (webhook verify)
 *  - FACEBOOK_APP_SECRET / facebook_app_secret      (optional signature)
 *  - facebook_bot_enabled = 1
 */
import crypto from 'crypto';
import { getSetting } from '../db/schema.js';

export function isFacebookBotEnabled() {
  if (process.env.FACEBOOK_BOT_ENABLED === '0') return false;
  const en = getSetting('facebook_bot_enabled', '0') === '1';
  return en && Boolean(getPageToken());
}

export function getPageToken() {
  return (
    getSetting('facebook_page_token', '') ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    ''
  ).trim();
}

export function getVerifyToken() {
  return (
    getSetting('facebook_verify_token', '') ||
    process.env.FACEBOOK_VERIFY_TOKEN ||
    'hoantienvn_fb'
  ).trim();
}

export function getAppSecret() {
  return (
    getSetting('facebook_app_secret', '') ||
    process.env.FACEBOOK_APP_SECRET ||
    ''
  ).trim();
}

/** Verify X-Hub-Signature-256 (nếu có app secret) */
export function verifyFacebookSignature(rawBody, signatureHeader) {
  const secret = getAppSecret();
  if (!secret) return true; // optional
  if (!signatureHeader || !rawBody) return false;
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(String(signatureHeader))
    );
  } catch {
    return false;
  }
}

/**
 * Gửi text Messenger
 * POST https://graph.facebook.com/v21.0/me/messages
 */
export async function sendFacebookText(psid, text) {
  const token = getPageToken();
  if (!token) {
    return { ok: false, skipped: true, reason: 'Chưa cấu hình PAGE_ACCESS_TOKEN' };
  }
  if (!psid) return { ok: false, error: 'Thiếu PSID' };

  const body = {
    recipient: { id: String(psid) },
    messaging_type: 'RESPONSE',
    message: { text: String(text).slice(0, 2000) },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (data.error) {
      console.error('[fb] send fail', data.error);
      return { ok: false, error: data.error.message || JSON.stringify(data.error) };
    }
    return { ok: true, messageId: data.message_id };
  } catch (e) {
    console.error('[fb] send error', e.message);
    return { ok: false, error: e.message };
  }
}

export function facebookStatus() {
  return {
    enabled: isFacebookBotEnabled(),
    hasToken: Boolean(getPageToken()),
    verifyTokenSet: Boolean(getVerifyToken()),
    hasAppSecret: Boolean(getAppSecret()),
    webhookUrl: '/api/facebook/webhook',
    hint: 'Meta App → Messenger → Webhook → Callback URL + Verify Token',
  };
}
