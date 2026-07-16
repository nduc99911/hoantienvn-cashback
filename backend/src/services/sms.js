/**
 * OTP SMS — provider: mock | espocrm-style ESMS | Twilio
 *
 * Env:
 *   SMS_PROVIDER=mock|esms|twilio
 *   ESMS_API_KEY, ESMS_SECRET_KEY, ESMS_BRANDNAME
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 *   OTP_TTL_SECONDS=300
 */
import crypto from 'crypto';
import { one, run, sqlNow } from '../db/schema.js';

function ttlSec() {
  return parseInt(process.env.OTP_TTL_SECONDS || '300', 10);
}

function hashCode(phone, code) {
  const secret = process.env.JWT_SECRET || 'otp';
  return crypto
    .createHmac('sha256', secret)
    .update(`${phone}:${code}`)
    .digest('hex');
}

function normalizePhone(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.startsWith('84')) p = '0' + p.slice(2);
  return p;
}

export function isSmsConfigured() {
  const p = process.env.SMS_PROVIDER || 'mock';
  if (p === 'mock') return true;
  if (p === 'esms') return Boolean(process.env.ESMS_API_KEY);
  if (p === 'twilio') return Boolean(process.env.TWILIO_ACCOUNT_SID);
  return false;
}

async function sendSmsRaw(phone, message) {
  const provider = process.env.SMS_PROVIDER || 'mock';
  if (provider === 'mock' || process.env.SMS_DEV_LOG === '1') {
    console.log('[sms:dev]', phone, message);
    return { ok: true, provider: 'mock' };
  }
  if (provider === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    const to = phone.startsWith('0') ? `+84${phone.slice(1)}` : phone;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const body = new URLSearchParams({ To: to, From: from, Body: message });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Twilio ${res.status}`);
    return { ok: true, provider: 'twilio', id: data.sid };
  }
  if (provider === 'esms') {
    // ESMS.vn simple send
    const url = new URL('https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/');
    const payload = {
      ApiKey: process.env.ESMS_API_KEY,
      SecretKey: process.env.ESMS_SECRET_KEY,
      Phone: phone,
      Content: message,
      Brandname: process.env.ESMS_BRANDNAME || 'Verify',
      SmsType: '2',
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (String(data.CodeResult) !== '100') {
      throw new Error(data.ErrorMessage || `ESMS ${data.CodeResult}`);
    }
    return { ok: true, provider: 'esms' };
  }
  throw new Error(`SMS provider không hỗ trợ: ${provider}`);
}

/**
 * @param {string} phone
 * @param {'register'|'login'|'reset'|'marketing'} purpose
 */
export async function sendOtp(phone, purpose = 'register') {
  const p = normalizePhone(phone);
  if (!/^0\d{9,10}$/.test(p)) {
    throw new Error('Số điện thoại không hợp lệ (VD: 09xxxxxxxx)');
  }

  // rate: max 1 / 45s same phone
  const recent = await one(
    `SELECT * FROM otp_codes WHERE phone = ? AND purpose = ?
     ORDER BY id DESC LIMIT 1`,
    [p, purpose]
  );
  if (recent) {
    const created = new Date(recent.created_at).getTime();
    if (Date.now() - created < 45_000) {
      throw new Error('Gửi OTP quá nhanh. Đợi ~45 giây.');
    }
  }

  const code = String(100000 + Math.floor(Math.random() * 900000));
  const expires = new Date(Date.now() + ttlSec() * 1000).toISOString();
  await run(
    `INSERT INTO otp_codes (phone, code_hash, purpose, expires_at)
     VALUES (?, ?, ?, ?)`,
    [p, hashCode(p, code), purpose, expires]
  );

  const msg = `HoanTienVN: Ma OTP ${code} (het han ${Math.round(ttlSec() / 60)} phut). Khong chia se.`;
  await sendSmsRaw(p, msg);

  const out = { success: true, phone: p, expiresIn: ttlSec() };
  if (process.env.SMS_PROVIDER === 'mock' || process.env.SMS_DEV_LOG === '1') {
    out.devCode = code;
  }
  return out;
}

export async function verifyOtp(phone, code, purpose = 'register') {
  const p = normalizePhone(phone);
  const c = String(code || '').trim();
  const row = await one(
    `SELECT * FROM otp_codes
     WHERE phone = ? AND purpose = ? AND used_at IS NULL
     ORDER BY id DESC LIMIT 1`,
    [p, purpose]
  );
  if (!row) throw new Error('OTP không tồn tại. Gửi lại mã.');
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error('OTP đã hết hạn');
  }
  if (row.code_hash !== hashCode(p, c)) {
    await run('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [
      row.id,
    ]);
    throw new Error('Sai mã OTP');
  }
  if ((row.attempts || 0) >= 5) throw new Error('Sai OTP quá nhiều lần');

  await run(`UPDATE otp_codes SET used_at = ${sqlNow()} WHERE id = ?`, [row.id]);
  return { success: true, phone: p };
}
