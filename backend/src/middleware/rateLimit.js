import { one, run, sqlNow, sqlNowMinusSeconds, isPostgres } from '../db/schema.js';

export function rateLimit({ keyFn, max = 30, windowSeconds = 60, message }) {
  return async (req, res, next) => {
    try {
      const key = keyFn(req);
      const row = await one(
        `SELECT * FROM rate_limits WHERE key = ?
         AND window_start >= ${sqlNowMinusSeconds(windowSeconds)}
         ORDER BY id DESC LIMIT 1`,
        [key]
      );

      if (!row) {
        await run(
          `INSERT INTO rate_limits (key, hits, window_start) VALUES (?, 1, ${sqlNow()})`,
          [key]
        );
        return next();
      }

      if (row.hits >= max) {
        return res.status(429).json({
          error: message || 'Quá nhiều request. Vui lòng thử lại sau.',
        });
      }

      await run('UPDATE rate_limits SET hits = hits + 1 WHERE id = ?', [row.id]);
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
