// Local: Vite proxy /api → :4000 | Production: VITE_API_URL=https://api...
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API = `${API_BASE}/api`;

function getToken() {
  return localStorage.getItem('token');
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Lỗi ${res.status}`);
  }
  return data;
}

export const authApi = {
  login: (email, password) =>
    api('/auth/login', { method: 'POST', body: { email, password } }),
  captcha: () => api('/auth/captcha'),
  register: (payload) =>
    api('/auth/register', { method: 'POST', body: payload }),
  forgotPassword: (email) =>
    api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (payload) =>
    api('/auth/reset-password', { method: 'POST', body: payload }),
  me: () => api('/auth/me'),
  updateProfile: (payload) =>
    api('/auth/profile', { method: 'PUT', body: payload }),
};

export const linksApi = {
  preview: (url) => api('/links/preview', { method: 'POST', body: { url } }),
  convert: (url) => api('/links/convert', { method: 'POST', body: { url } }),
  mine: () => api('/links/mine'),
};

export const walletApi = {
  summary: () => api('/wallet/summary'),
  transactions: () => api('/wallet/transactions'),
  orders: () => api('/wallet/orders'),
  withdraw: (payload) =>
    api('/wallet/withdraw', { method: 'POST', body: payload }),
  withdrawals: () => api('/wallet/withdrawals'),
  referrals: () => api('/wallet/referrals'),
  demoOrder: (payload) =>
    api('/wallet/demo-order', { method: 'POST', body: payload || {} }),
  completeOrder: (id) =>
    api(`/wallet/orders/${id}/complete`, { method: 'POST' }),
};

export const claimsApi = {
  create: (payload) => api('/claims', { method: 'POST', body: payload }),
  mine: () => api('/claims/mine'),
};

export const adminApi = {
  stats: () => api('/admin/stats'),
  settings: () => api('/admin/settings'),
  updateSettings: (payload) =>
    api('/admin/settings', { method: 'PUT', body: payload }),
  orders: (status) =>
    api(status ? `/admin/orders?status=${status}` : '/admin/orders'),
  approveOrder: (id, note) =>
    api(`/admin/orders/${id}/approve`, { method: 'POST', body: { note } }),
  rejectOrder: (id, note) =>
    api(`/admin/orders/${id}/reject`, { method: 'POST', body: { note } }),
  releaseOrder: (id) =>
    api(`/admin/orders/${id}/release`, { method: 'POST' }),
  releaseDue: () => api('/admin/hold/release-due', { method: 'POST' }),
  withdrawals: () => api('/admin/withdrawals'),
  processWithdraw: (id, status, note) =>
    api(`/admin/withdrawals/${id}/process`, {
      method: 'POST',
      body: { status, note },
    }),
  importOrders: (payload) =>
    api('/admin/import-orders', { method: 'POST', body: payload }),
  importPreview: (csv) =>
    api('/admin/import-preview', { method: 'POST', body: { csv } }),
  clicks: () => api('/admin/clicks'),
  users: () => api('/admin/users'),
  banUser: (id, status) =>
    api(`/admin/users/${id}/ban`, { method: 'POST', body: { status } }),
  setUserRole: (id, role) =>
    api(`/admin/users/${id}/role`, { method: 'POST', body: { role } }),
  testTelegram: () => api('/admin/telegram/test', { method: 'POST' }),
  commsStatus: () => api('/admin/comms/status'),
  testEmail: (to) =>
    api('/admin/email/test', { method: 'POST', body: { to } }),
  marketingCampaigns: () => api('/admin/marketing/campaigns'),
  createCampaign: (payload) =>
    api('/admin/marketing/campaigns', { method: 'POST', body: payload }),
  sendCampaign: (id) =>
    api(`/admin/marketing/campaigns/${id}/send`, { method: 'POST' }),
  staff: () => api('/admin/staff'),
  rbac: () => api('/admin/rbac'),
  opsChecklist: () => api('/admin/ops/checklist'),
};

export const otpApi = {
  send: (phone, purpose = 'register') =>
    api('/auth/otp/send', { method: 'POST', body: { phone, purpose } }),
  verify: (phone, code, purpose = 'register') =>
    api('/auth/otp/verify', {
      method: 'POST',
      body: { phone, code, purpose },
    }),
};

export const blogApi = {
  list: (category) =>
    api(category ? `/blog?category=${encodeURIComponent(category)}` : '/blog'),
  categories: () => api('/blog/categories'),
  get: (slug) => api(`/blog/${slug}`),
  adminAll: () => api('/blog/admin/all'),
  create: (payload) => api('/blog/admin', { method: 'POST', body: payload }),
  update: (id, payload) =>
    api(`/blog/admin/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => api(`/blog/admin/${id}`, { method: 'DELETE' }),
};

export const notifApi = {
  list: () => api('/notifications'),
  read: (id) => api(`/notifications/${id}/read`, { method: 'POST' }),
  readAll: () => api('/notifications/read-all', { method: 'POST' }),
};

export const publicApi = {
  config: () => api('/public/config'),
  stats: () => api('/public/stats'),
};

export const vouchersApi = {
  list: () => api('/vouchers'),
  adminAll: () => api('/vouchers/admin/all'),
  create: (payload) =>
    api('/vouchers/admin', { method: 'POST', body: payload }),
  update: (id, payload) =>
    api(`/vouchers/admin/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => api(`/vouchers/admin/${id}`, { method: 'DELETE' }),
};

export function googleAuthStartUrl(ref) {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  return `${base}/api/auth/google/start${q}`;
}

export const zaloApi = {
  bindCode: () => api('/zalo/bind-code', { method: 'POST' }),
  bindStatus: () => api('/zalo/bind-status'),
  test: (payload) => api('/zalo/test', { method: 'POST', body: payload }),
  linkedUsers: () => api('/zalo/linked-users'),
  personalStatus: () => api('/admin/zalo-personal/status'),
  personalToggle: (payload) =>
    api('/admin/zalo-personal/toggle', { method: 'POST', body: payload }),
  personalRestart: () =>
    api('/admin/zalo-personal/restart', { method: 'POST' }),
};

export const facebookApi = {
  status: () => api('/facebook/status'),
  bindCode: () => api('/facebook/bind-code', { method: 'POST' }),
  bindStatus: () => api('/facebook/bind-status'),
  test: (payload) => api('/facebook/test', { method: 'POST', body: payload }),
  linkedUsers: () => api('/facebook/linked-users'),
};

export const telegramApi = {
  status: () => api('/telegram/status'),
  bindCode: () => api('/telegram/bind-code', { method: 'POST' }),
  bindStatus: () => api('/telegram/bind-status'),
  test: (payload) => api('/telegram/test', { method: 'POST', body: payload }),
  linkedUsers: () => api('/telegram/linked-users'),
};

export function formatVnd(n) {
  return `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;
}

export function formatPct(rate) {
  return `${((rate || 0) * 100).toFixed(1)}%`;
}

export const ORDER_STATUS = {
  pending_review: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  pending: { label: 'Tạm tính', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  completed: { label: 'Đã giao', cls: 'bg-indigo-100 text-indigo-700' },
  held: { label: 'Đang hold', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  paid: { label: 'Đã vào ví', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected: { label: 'Từ chối', cls: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Hủy', cls: 'bg-slate-100 text-slate-500' },
};
