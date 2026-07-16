/**
 * Test email production: comms status + admin test + forgot-password
 * Usage: node scripts/test-email-flow.mjs [toEmail]
 */
const API = (process.env.API_BASE || 'https://hoantienvn-api.onrender.com').replace(
  /\/$/,
  ''
);
const toArg = process.argv[2] || '';

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

console.log('API', API);

// health
const h = await api('/api/health');
console.log('1. health', h.status, h.data.ok ? 'ok' : h.data);

// admin login
const login = await api('/api/auth/login', {
  method: 'POST',
  body: { email: 'admin@hoantien.vn', password: 'admin123' },
});
if (!login.data.token) {
  console.error('2. login FAIL', login);
  process.exit(1);
}
console.log('2. admin login ok, role=', login.data.user?.role);
const token = login.data.token;

// comms status
const st = await api('/api/admin/comms/status', { token });
console.log('3. comms', JSON.stringify(st.data));

// test email
const to = toArg || login.data.user?.email || 'admin@hoantien.vn';
const te = await api('/api/admin/email/test', {
  method: 'POST',
  token,
  body: { to },
});
console.log('4. test email →', to, te.status, JSON.stringify(te.data));

// forgot password (demo)
const fp = await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: 'demo@hoantien.vn' },
});
console.log('5. forgot-password demo@', fp.status, JSON.stringify(fp.data));

// forgot for admin email too (Resend often only allows verified recipient)
const fp2 = await api('/api/auth/forgot-password', {
  method: 'POST',
  body: { email: 'admin@hoantien.vn' },
});
console.log('6. forgot-password admin@', fp2.status, JSON.stringify(fp2.data));

if (te.status !== 200 || !te.data.ok) {
  console.log('\n⚠️ Test email failed — xem error Resend (domain/from/to).');
  process.exit(1);
}
console.log('\n✅ Test email API returned ok — check inbox (và spam).');
