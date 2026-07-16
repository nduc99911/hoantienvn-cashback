import { db } from '../db/schema.js';

/**
 * Simple SQLite rate limit: max hits per windowSeconds for a key.
 */
export function rateLimit({ keyFn, max = 30, windowSeconds = 60, message }) {
  return (req, res, next) => {
    try {
      const key = keyFn(req);
      const row = db
        .prepare(
          `SELECT * FROM rate_limits WHERE key = ?
           AND window_start >= datetime('now', ?)
           ORDER BY id DESC LIMIT 1`
        )
        .get(key, `-${windowSeconds} seconds`);

      if (!row) {
        db.prepare(
          `INSERT INTO rate_limits (key, hits, window_start) VALUES (?, 1, datetime('now'))`
        ).run(key);
        return next();
      }

      if (row.hits >= max) {
        return res.status(429).json({
          error: message || 'Quá nhiều request. Vui lòng thử lại sau.',
        });
      }

      db.prepare('UPDATE rate_limits SET hits = hits + 1 WHERE id = ?').run(row.id);
      next();
    } catch (e) {
      console.error('rateLimit', e);
      next();
    }
  };
}

export const limitAuth = rateLimit({
  keyFn: (req) => `auth:${req.ip}:${req.path}`,
  max: 20,
  windowSeconds: 300,
  message: 'Thử đăng nhập/đăng ký quá nhiều. Đợi 5 phút.',
});

export const limitClaim = rateLimit({
  keyFn: (req) => `claim:${req.user?.id || req.ip}`,
  max: 15,
  windowSeconds: 3600,
  message: 'Khai báo quá nhiều. Thử lại sau 1 giờ.',
});

export const limitConvert = rateLimit({
  keyFn: (req) => `convert:${req.user?.id || req.ip}`,
  max: 60,
  windowSeconds: 3600,
  message: 'Tạo link quá nhiều. Thử lại sau.',
});
