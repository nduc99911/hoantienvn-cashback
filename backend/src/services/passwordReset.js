import crypto from 'crypto';
import { one, run, sqlNow } from '../db/schema.js';
import { hashPassword } from '../utils/auth.js';
import { sendPasswordResetEmail, isEmailConfigured } from './email.js';
import { getSetting } from '../db/schema.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function siteBase() {
  return (
    process.env.SITE_URL ||
    process.env.PUBLIC_URL ||
    getSetting('site_url', 'http://localhost:5173')
  ).replace(/\/$/, '');
}

/**
 * Tạo token + gửi email. Luôn trả message chung (không lộ email tồn tại).
 */
export async function requestPasswordReset(email) {
  const emailNorm = String(email || '')
    .toLowerCase()
    .trim();
  const generic = {
    success: true,
    message:
      'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
  };

  if (!emailNorm) return generic;

  const user = await one('SELECT * FROM users WHERE email = ?', [emailNorm]);
  if (!user || user.status === 'banned') {
    return generic;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // vô hiệu token cũ
  await run(
    `UPDATE password_resets SET used_at = ${sqlNow()}
     WHERE user_id = ? AND used_at IS NULL`,
    [user.id]
  );

  await run(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [user.id, tokenHash, expiresAt]
  );

  const resetUrl = `${siteBase()}/reset-password?token=${rawToken}`;

  try {
    const sent = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
    if (process.env.EMAIL_DEV_LOG === '1' || process.env.NODE_ENV !== 'production') {
      console.log('[password-reset]', user.email, resetUrl, sent);
    }
  } catch (e) {
    console.error('[password-reset] email fail', e.message);
    // Vẫn trả generic — có thể admin xem log
  }

  // Dev helper: trả link khi EMAIL_DEV_LOG (chỉ non-prod)
  if (
    process.env.EMAIL_DEV_LOG === '1' &&
    process.env.NODE_ENV !== 'production'
  ) {
    return { ...generic, devResetUrl: resetUrl, emailConfigured: isEmailConfigured() };
  }

  return { ...generic, emailConfigured: isEmailConfigured() };
}

export async function resetPasswordWithToken(token, newPassword) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token không hợp lệ');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Mật khẩu tối thiểu 6 ký tự');
  }

  const tokenHash = hashToken(token);
  const row = await one(
    `SELECT * FROM password_resets
     WHERE token_hash = ? AND used_at IS NULL
     LIMIT 1`,
    [tokenHash]
  );
  if (!row) throw new Error('Link đặt lại không hợp lệ hoặc đã dùng');

  const exp = new Date(row.expires_at).getTime();
  if (!Number.isFinite(exp) || Date.now() > exp) {
    throw new Error('Link đặt lại đã hết hạn. Yêu cầu lại.');
  }

  const user = await one('SELECT * FROM users WHERE id = ?', [row.user_id]);
  if (!user) throw new Error('Tài khoản không tồn tại');

  await run('UPDATE users SET password_hash = ? WHERE id = ?', [
    hashPassword(newPassword),
    user.id,
  ]);
  await run(`UPDATE password_resets SET used_at = ${sqlNow()} WHERE id = ?`, [
    row.id,
  ]);
  // invalidate other tokens
  await run(
    `UPDATE password_resets SET used_at = ${sqlNow()}
     WHERE user_id = ? AND used_at IS NULL`,
    [user.id]
  );

  return { success: true, message: 'Đổi mật khẩu thành công. Hãy đăng nhập.' };
}
