import { one, run, sqlNow, sqlNowMinusSeconds } from '../db/schema.js';

/** IP sau reverse proxy (Render/Vercel) */
export function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) {
    return xf.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

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
        res.setHeader('Retry-After', String(windowSeconds));
        return res.status(429).json({
          error: message || 'Quá nhiều request. Vui lòng thử lại sau.',
          retryAfter: windowSeconds,
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

/** Login — 15 lần / 5 phút / IP */
export const limitAuth = rateLimit({
  keyFn: (req) => `auth:${clientIp(req)}:${req.path}`,
  max: 15,
  windowSeconds: 300,
  message: 'Thử đăng nhập quá nhiều. Đợi 5 phút.',
});

/** Đăng ký — chặt hơn: 5 tài khoản / giờ / IP */
export const limitRegister = rateLimit({
  keyFn: (req) => `register:${clientIp(req)}`,
  max: 5,
  windowSeconds: 3600,
  message: 'Đăng ký quá nhiều từ IP này. Thử lại sau 1 giờ.',
});

/** Email đăng ký — 3 lần / ngày (chống spam cùng domain pattern) */
export const limitRegisterEmail = rateLimit({
  keyFn: (req) => {
    const email = String(req.body?.email || '')
      .toLowerCase()
      .trim();
    const domain = email.includes('@') ? email.split('@')[1] : 'unknown';
    return `register-email:${clientIp(req)}:${domain}`;
  },
  max: 8,
  windowSeconds: 86400,
  message: 'Quá nhiều đăng ký cùng loại email. Thử lại sau.',
});

export const limitClaim = rateLimit({
  keyFn: (req) => `claim:${req.user?.id || clientIp(req)}`,
  max: 15,
  windowSeconds: 3600,
  message: 'Khai báo quá nhiều. Thử lại sau 1 giờ.',
});

export const limitConvert = rateLimit({
  keyFn: (req) => `convert:${req.user?.id || clientIp(req)}`,
  max: 60,
  windowSeconds: 3600,
  message: 'Tạo link quá nhiều. Thử lại sau.',
});

/** Lấy captcha — 30 / 10 phút / IP */
export const limitCaptcha = rateLimit({
  keyFn: (req) => `captcha:${clientIp(req)}`,
  max: 30,
  windowSeconds: 600,
  message: 'Xin captcha quá nhiều. Đợi vài phút.',
});
