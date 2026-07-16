import { one, many, run } from '../db/schema.js';

export async function createNotification({
  userId = null,
  roleTarget = null,
  type,
  title,
  body,
  meta = null,
}) {
  const info = await run(
    `INSERT INTO notifications (user_id, role_target, type, title, body, meta)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      roleTarget,
      type,
      title,
      body,
      meta ? JSON.stringify(meta) : null,
    ]
  );

  if (userId) {
    try {
      const u = await one(
        'SELECT zalo_id, telegram_id FROM users WHERE id = ?',
        [userId]
      );
      const msg = `🔔 ${title}\n${body || ''}`;
      if (u?.zalo_id) {
        import('./zcaPersonal.js')
          .then(async ({ isZcaOnline, sendZcaText }) => {
            if (isZcaOnline()) {
              return sendZcaText(u.zalo_id, msg);
            }
            const { sendZaloText } = await import('./zalo.js');
            return sendZaloText(u.zalo_id, msg);
          })
          .catch(() => {});
      }
      if (u?.telegram_id) {
        import('./telegram.js')
          .then(({ sendTelegramTo }) => sendTelegramTo(u.telegram_id, msg))
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }

  return info.lastInsertRowid;
}

export async function listNotifications(user, { limit = 50 } = {}) {
  if (user.role === 'admin') {
    return many(
      `SELECT * FROM notifications
       WHERE user_id = ? OR role_target = 'admin' OR role_target = 'all'
       ORDER BY created_at DESC LIMIT ?`,
      [user.id, limit]
    );
  }
  return many(
    `SELECT * FROM notifications
     WHERE user_id = ? OR role_target = 'all'
     ORDER BY created_at DESC LIMIT ?`,
    [user.id, limit]
  );
}

export async function markRead(userId, id) {
  await run(
    `UPDATE notifications SET is_read = 1
     WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
    [id, userId]
  );
}

export async function markAllRead(user) {
  if (user.role === 'admin') {
    await run(
      `UPDATE notifications SET is_read = 1
       WHERE user_id = ? OR role_target IN ('admin','all')`,
      [user.id]
    );
  } else {
    await run(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? OR role_target = 'all'`,
      [user.id]
    );
  }
}
