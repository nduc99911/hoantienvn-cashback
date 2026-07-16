import { verifyToken } from '../utils/auth.js';
import { one } from '../db/schema.js';
import {
  hasPermission,
  isStaffRole,
  listPermissions,
} from '../services/rbac.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    const user = await one('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }
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

/** Staff: admin / finance / support / super_admin */
export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    if (!isStaffRole(req.user?.role)) {
      return res.status(403).json({ error: 'Không có quyền admin' });
    }
    next();
  });
}

/** Quyền chi tiết: requirePermission('orders.approve') */
export function requirePermission(permission) {
  return async (req, res, next) => {
    await requireAuth(req, res, async () => {
      if (!hasPermission(req.user?.role, permission)) {
        return res.status(403).json({
          error: `Thiếu quyền: ${permission}`,
          role: req.user?.role,
          permissions: listPermissions(req.user?.role),
        });
      }
      next();
    });
  };
}
