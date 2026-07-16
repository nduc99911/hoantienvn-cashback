const API = 'https://hoantienvn-api.onrender.com';
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const login = await api('/api/auth/login', {
  method: 'POST',
  body: { email: 'admin@hoantien.vn', password: 'admin123' },
});
const t = login.data.token;
const sub = 'U5_CHE78SEQ';
const csv = [
  'orderId,amount,commission,subId,productName',
  `E2ETEST999,500000,100000,${sub},E2E product`,
].join('\n');

const prev = await api('/api/admin/import-preview', {
  method: 'POST',
  token: t,
  body: { csv },
});
console.log('PREVIEW', JSON.stringify(prev, null, 2));

const imp = await api('/api/admin/import-orders', {
  method: 'POST',
  token: t,
  body: { csv, autoHold: true, onlyCompleted: false },
});
console.log('IMPORT', JSON.stringify(imp, null, 2));
