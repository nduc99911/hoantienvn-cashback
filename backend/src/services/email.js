/**
 * Gửi email — Resend / SMTP / dev log
 *
 * Ưu tiên: RESEND_API_KEY → SMTP_* → EMAIL_DEV_LOG
 */
import { getSetting } from '../db/schema.js';

export function isEmailConfigured() {
  if ((process.env.RESEND_API_KEY || '').trim()) return true;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) return true;
  if (process.env.EMAIL_DEV_LOG === '1') return true;
  return false;
}

export function emailProviderInfo() {
  if ((process.env.RESEND_API_KEY || '').trim()) {
    return { configured: true, provider: 'resend' };
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return { configured: true, provider: 'smtp', host: process.env.SMTP_HOST };
  }
  if (process.env.EMAIL_DEV_LOG === '1') {
    return { configured: true, provider: 'dev-log' };
  }
  return { configured: false, provider: null };
}

function fromAddress() {
  return (
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    getSetting('support_email', 'noreply@hoantien.vn')
  );
}

async function sendViaResend({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      subject,
      html,
      text,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Resend HTTP ${res.status}`);
  }
  return { ok: true, id: data.id, provider: 'resend' };
}

async function sendViaSmtp({ to, subject, html, text }) {
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === '1',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const info = await transporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    html,
    text,
  });
  return { ok: true, id: info.messageId, provider: 'smtp' };
}

export async function sendEmail({ to, subject, html, text }) {
  if (process.env.EMAIL_DEV_LOG === '1' || !isEmailConfigured()) {
    console.log('[email:dev]', { to, subject, text: text || html?.slice(0, 200) });
    if (!isEmailConfigured() && process.env.EMAIL_DEV_LOG !== '1') {
      return { ok: false, skipped: true, reason: 'Email chưa cấu hình SMTP/Resend' };
    }
    return { ok: true, provider: 'dev-log' };
  }
  if (process.env.RESEND_API_KEY) {
    return sendViaResend({ to, subject, html, text });
  }
  return sendViaSmtp({ to, subject, html, text });
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const subject = 'Đặt lại mật khẩu HoanTienVN';
  const text = [
    `Xin chào ${name || 'bạn'},`,
    '',
    'Bạn (hoặc ai đó) yêu cầu đặt lại mật khẩu HoanTienVN.',
    `Mở link sau (hết hạn 1 giờ):`,
    resetUrl,
    '',
    'Nếu không phải bạn, hãy bỏ qua email này.',
  ].join('\n');
  const html = `
    <div style="font-family:sans-serif;max-width:480px;line-height:1.5">
      <h2 style="color:#EE4D2D">HoanTienVN</h2>
      <p>Xin chào <b>${escapeHtml(name || 'bạn')}</b>,</p>
      <p>Bạn yêu cầu đặt lại mật khẩu. Bấm nút bên dưới (link hết hạn <b>1 giờ</b>):</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}" style="background:#EE4D2D;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
          Đặt lại mật khẩu
        </a>
      </p>
      <p style="font-size:13px;color:#666">Hoặc copy: <br/><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="font-size:12px;color:#999">Nếu không phải bạn, bỏ qua email này.</p>
    </div>`;
  return sendEmail({ to, subject, html, text });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
