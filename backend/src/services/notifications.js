import { db } from '../db/schema.js';

export function createNotification({
  userId = null,
  roleTarget = null,
  type,
  title,
  body,
  meta = null,
}) {
  const info = db
    .prepare(
      `INSERT INTO notifications (user_id, role_target, type, title, body, meta)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      roleTarget,
      type,
      title,
      body,
      meta ? JSON.stringify(meta) : null
    );

  // Push Zalo / Telegram nếu user đã liên kết
  if (userId) {
    try {
      const u = db
        .prepare('SELECT zalo_id, telegram_id FROM users WHERE id = ?')
        .get(userId);
      const msg = `🔔 ${title}\n${body || ''}`;
      if (u?.zalo_id) {
        import('./zalo.js')
          .then(({ sendZaloText }) => sendZaloText(u.zalo_id, msg))
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

export function listNotifications(user, { limit = 50 } = {}) {
  if (user.role === 'admin') {
    return db
      .prepare(
        `SELECT * FROM notifications
         WHERE user_id = ? OR role_target = 'admin' OR role_target = 'all'
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(user.id, limit);
  }
  return db
    .prepare(
      `SELECT * FROM notifications
       WHERE user_id = ? OR role_target = 'all'
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(user.id, limit);
}

export function markRead(userId, id) {
  db.prepare(
    `UPDATE notifications SET is_read = 1
     WHERE id = ? AND (user_id = ? OR user_id IS NULL)`
  ).run(id, userId);
}

export function markAllRead(user) {
  if (user.role === 'admin') {
    db.prepare(
      `UPDATE notifications SET is_read = 1
       WHERE user_id = ? OR role_target IN ('admin','all')`
    ).run(user.id);
  } else {
    db.prepare(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? OR role_target = 'all'`
    ).run(user.id);
  }
}
