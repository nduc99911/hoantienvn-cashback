/**
 * Captcha toán học ký HMAC — không cần dịch vụ ngoài, không lưu DB.
 * Token: base64url(payload).sig
 * payload = a|b|expMs|nonce
 */
import crypto from 'crypto';

function secret() {
  return (
    process.env.CAPTCHA_SECRET ||
    process.env.JWT_SECRET ||
    'hoantienvn-captcha-dev'
  );
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromB64url(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** Tạo câu hỏi captcha */
export function createMathCaptcha() {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const exp = Date.now() + 10 * 60 * 1000; // 10 phút
  const nonce = crypto.randomBytes(6).toString('hex');
  const payload = `${a}|${b}|${exp}|${nonce}`;
  const token = `${b64url(payload)}.${sign(payload)}`;
  return {
    captchaToken: token,
    question: `${a} + ${b} = ?`,
    expiresAt: exp,
  };
}

/**
 * Verify answer
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function verifyMathCaptcha(token, answer) {
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'Thiếu captcha. Tải lại trang đăng ký.' };
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { ok: false, error: 'Captcha không hợp lệ' };
  }
  const [payloadB64, sig] = parts;
  let payload;
  try {
    payload = fromB64url(payloadB64).toString('utf8');
  } catch {
    return { ok: false, error: 'Captcha không hợp lệ' };
  }
  const expectedSig = sign(payload);
  const aBuf = Buffer.from(sig);
  const bBuf = Buffer.from(expectedSig);
  if (aBuf.length !== bBuf.length || !crypto.timingSafeEqual(aBuf, bBuf)) {
    return { ok: false, error: 'Captcha không hợp lệ' };
  }
  const [aStr, bStr, expStr] = payload.split('|');
  const a = Number(aStr);
  const b = Number(bStr);
  const exp = Number(expStr);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(exp)) {
    return { ok: false, error: 'Captcha không hợp lệ' };
  }
  if (Date.now() > exp) {
    return { ok: false, error: 'Captcha hết hạn. Bấm làm mới.' };
  }
  const ans = Number(String(answer ?? '').trim());
  if (!Number.isFinite(ans) || ans !== a + b) {
    return { ok: false, error: 'Sai kết quả captcha' };
  }
  return { ok: true };
}

/** Honeypot: field ẩn (website/company) phải rỗng */
export function isHoneypotFilled(body) {
  const traps = ['website', 'company', 'url', 'fax'];
  return traps.some((k) => {
    const v = body?.[k];
    return typeof v === 'string' && v.trim().length > 0;
  });
}
