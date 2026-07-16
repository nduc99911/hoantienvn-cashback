import { verifyToken } from '../utils/auth.js';
import { one } from '../db/schema.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    const user = await one('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(header.slice(7));
      req.user = await one('SELECT * FROM users WHERE id = ?', [payload.id]);
    } catch {
      /* ignore */
    }
  }
  next();
}

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền admin' });
    }
    next();
  });
}
