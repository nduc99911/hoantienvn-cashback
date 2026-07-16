/**
 * Email marketing — gửi chiến dịch tới user opt-in
 */
import { many, one, run, sqlNow } from '../db/schema.js';
import { sendEmail, isEmailConfigured } from './email.js';

export async function listCampaigns(limit = 50) {
  return many(
    `SELECT * FROM email_campaigns ORDER BY id DESC LIMIT ?`,
    [limit]
  );
}

export async function createCampaign({ subject, bodyHtml, bodyText, audience, createdBy }) {
  if (!subject?.trim() || !bodyHtml?.trim()) {
    throw new Error('Cần subject và nội dung HTML');
  }
  const info = await run(
    `INSERT INTO email_campaigns
     (subject, body_html, body_text, status, audience, created_by)
     VALUES (?, ?, ?, 'draft', ?, ?)`,
    [
      subject.trim(),
      bodyHtml,
      bodyText || '',
      audience || 'opted_in',
      createdBy || null,
    ]
  );
  return one('SELECT * FROM email_campaigns WHERE id = ?', [
    info.lastInsertRowid,
  ]);
}

export async function getAudienceEmails(audience = 'opted_in') {
  if (audience === 'all') {
    return many(
      `SELECT id, email, name FROM users
       WHERE status = 'active' AND email IS NOT NULL AND email != ''`
    );
  }
  return many(
    `SELECT id, email, name FROM users
     WHERE status = 'active'
       AND COALESCE(marketing_opt_in, 1) = 1
       AND email IS NOT NULL AND email != ''`
  );
}

export async function sendCampaign(campaignId) {
  if (!isEmailConfigured()) {
    throw new Error(
      'Chưa cấu hình email (SMTP/Resend). Set RESEND_API_KEY hoặc SMTP_*'
    );
  }
  const camp = await one('SELECT * FROM email_campaigns WHERE id = ?', [
    campaignId,
  ]);
  if (!camp) throw new Error('Không tìm thấy campaign');
  if (camp.status === 'sent') throw new Error('Campaign đã gửi');

  await run(
    `UPDATE email_campaigns SET status = 'sending' WHERE id = ?`,
    [campaignId]
  );

  const recipients = await getAudienceEmails(camp.audience || 'opted_in');
  let sent = 0;
  let fail = 0;

  for (const u of recipients) {
    try {
      const html = String(camp.body_html)
        .replace(/\{\{name\}\}/g, u.name || 'bạn')
        .replace(/\{\{email\}\}/g, u.email);
      await sendEmail({
        to: u.email,
        subject: camp.subject,
        html,
        text: camp.body_text || undefined,
      });
      sent += 1;
    } catch (e) {
      console.error('[marketing]', u.email, e.message);
      fail += 1;
    }
  }

  await run(
    `UPDATE email_campaigns SET
      status = 'sent',
      sent_count = ?,
      fail_count = ?,
      sent_at = ${sqlNow()}
     WHERE id = ?`,
    [sent, fail, campaignId]
  );

  return { success: true, sent, fail, total: recipients.length };
}

export async function setMarketingOptIn(userId, optIn) {
  await run(`UPDATE users SET marketing_opt_in = ? WHERE id = ?`, [
    optIn ? 1 : 0,
    userId,
  ]);
  return { success: true, marketingOptIn: Boolean(optIn) };
}
