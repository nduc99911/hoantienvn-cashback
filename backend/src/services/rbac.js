/**
 * Phân quyền chi tiết
 * Roles: super_admin > admin > finance > support > user
 */
export const ROLES = ['super_admin', 'admin', 'finance', 'support', 'user'];

/** Quyền dạng namespace.action hoặc * */
export const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    'orders.read',
    'orders.approve',
    'orders.reject',
    'orders.release',
    'withdraw.read',
    'withdraw.process',
    'import.run',
    'users.read',
    'users.ban',
    'users.role', // promote except super
    'settings.read',
    'settings.write',
    'blog.write',
    'telegram.use',
    'marketing.read',
    'marketing.send',
    'staff.read',
    'email.test',
    'stats.read',
  ],
  finance: [
    'orders.read',
    'orders.approve',
    'orders.release',
    'withdraw.read',
    'withdraw.process',
    'import.run',
    'users.read',
    'settings.read',
    'stats.read',
  ],
  support: [
    'orders.read',
    'orders.reject',
    'users.read',
    'users.ban',
    'telegram.use',
    'stats.read',
  ],
  user: [],
};

export function isStaffRole(role) {
  return ['super_admin', 'admin', 'finance', 'support'].includes(role);
}

export function hasPermission(role, permission) {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;
  // wildcard namespace: orders.*
  const [ns] = permission.split('.');
  if (perms.includes(`${ns}.*`)) return true;
  return false;
}

export function listPermissions(role) {
  if (role === 'super_admin') return ['*'];
  return ROLE_PERMISSIONS[role] || [];
}

/** Ai được gán role nào */
export function canAssignRole(actorRole, targetRole) {
  if (actorRole === 'super_admin') return ROLES.includes(targetRole);
  if (actorRole === 'admin') {
    return ['admin', 'finance', 'support', 'user'].includes(targetRole);
  }
  return false;
}
