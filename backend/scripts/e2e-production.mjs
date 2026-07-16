/**
 * E2E production: register → convert → click /r → import CSV → hold → release → withdraw
 *
 * Usage:
 *   node scripts/e2e-production.mjs
 *   API_BASE=https://hoantienvn-api.onrender.com node scripts/e2e-production.mjs
 */
const API = (process.env.API_BASE || 'https://hoantienvn-api.onrender.com').replace(
  /\/$/,
  ''
);

const ts = Date.now();
const email = `e2e_${ts}@test.hoantien.vn`;
const password = 'E2eTest123!';
const name = `E2E User ${ts}`;
const productUrl =
  process.env.TEST_SHOPEE_URL ||
  'https://shopee.vn/product/684726466/23922474647';

const steps = [];
function log(step, ok, detail = '') {
  const line = `${ok ? '✅' : '❌'} ${step}${detail ? ` — ${detail}` : ''}`;
  steps.push({ step, ok, detail });
  console.log(line);
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text?.slice(0, 200) };
  }
  return { res, data, status: res.status };
}

async function main() {
  console.log(`\n🧪 E2E production → ${API}\n`);

  // 0. Health
  {
    const { status, data } = await api('/api/health');
    const ok = status === 200 && data.ok;
    log('Health', ok, `db=${data.database} tg=${data.telegramBot}`);
    if (!ok) throw new Error('API không healthy');
  }

  // 1. Captcha + Register
  let userToken;
  let user;
  {
    const cap = await api('/api/auth/captcha');
    const q = cap.data.question || '';
    const m = q.match(/(\d+)\s*\+\s*(\d+)/);
    const answer = m ? Number(m[1]) + Number(m[2]) : null;
    log('Captcha', cap.status === 200 && answer != null, q);

    const { status, data } = await api('/api/auth/register', {
      method: 'POST',
      body: {
        email,
        password,
        name,
        phone: '0901234567',
        captchaToken: cap.data.captchaToken,
        captchaAnswer: answer,
      },
    });
    const ok = status === 200 && data.token && data.token !== 'invalid';
    userToken = data.token;
    user = data.user;
    log(
      'Đăng ký',
      ok,
      ok
        ? `id=${user.id} sub=${user.affSubId || user.referralCode}`
        : data.error || status
    );
    if (!ok) throw new Error(data.error || 'register fail');
  }

  // 2. Convert link
  let shortCode;
  let subId;
  {
    const { status, data } = await api('/api/links/convert', {
      method: 'POST',
      token: userToken,
      body: { url: productUrl },
    });
    const ok = status === 200 && data.shortCode;
    shortCode = data.shortCode;
    subId = data.subId;
    log(
      'Convert link',
      ok,
      ok
        ? `code=${shortCode} sub=${subId} name=${(data.productName || '').slice(0, 40)}`
        : data.error || status
    );
    if (!ok) throw new Error(data.error || 'convert fail');
  }

  // 3. Click /r/:code
  {
    const res = await fetch(`${API}/r/${shortCode}`, {
      method: 'GET',
      redirect: 'manual',
    });
    // 302/301 to shopee OR 200 with body
    const ok = res.status === 302 || res.status === 301 || res.status === 200;
    const loc = res.headers.get('location') || '';
    log(
      'Click /r/…',
      ok,
      `HTTP ${res.status}${loc ? ` → ${loc.slice(0, 80)}` : ''}`
    );
  }

  // 4. Admin login
  let adminToken;
  {
    const { status, data } = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@hoantien.vn', password: 'admin123' },
    });
    const ok = status === 200 && data.token && data.user?.role === 'admin';
    adminToken = data.token;
    log('Admin login', ok, ok ? `role=${data.user.role}` : data.error || status);
    if (!ok) throw new Error('admin login fail');
  }

  // 5. Import CSV (simple format) with user sub_id
  // commission 100000 → cashback ~70000 (>= min withdraw 50k)
  const orderId = `E2E${ts}`;
  const csv = [
    'orderId,amount,commission,subId,productName',
    `${orderId},500000,100000,${subId},"E2E test product"`,
  ].join('\n');

  let importedOrderDbId;
  {
    const { status, data } = await api('/api/admin/import-orders', {
      method: 'POST',
      token: adminToken,
      body: { csv, autoHold: true, onlyCompleted: false },
    });
    const importedN = Number(data.imported || 0);
    const ok = status === 200 && data.success && importedN > 0;
    const failSample = (data.results || [])
      .filter((r) => !r.ok)
      .slice(0, 2)
      .map((r) => r.error)
      .join('; ');
    const detail = data.error
      ? data.error
      : `imported=${importedN} failed=${data.failed || 0} skipped=${data.skipped || 0}${failSample ? ` (${failSample})` : ''}`;
    log('Import CSV', ok, detail);

    // Find order for user
    const orders = await api('/api/admin/orders', { token: adminToken });
    const found = (orders.data.orders || []).find(
      (o) => o.orderId === orderId || o.order_id === orderId
    );
    if (found) {
      importedOrderDbId = found.id;
      log(
        'Order after import',
        true,
        `id=${found.id} status=${found.status} cashback=${found.cashbackAmount ?? found.cashback_amount}`
      );
    } else {
      // try user orders
      const uo = await api('/api/wallet/orders', { token: userToken });
      const f2 = (uo.data.orders || []).find(
        (o) => o.orderId === orderId || o.order_id === orderId
      );
      if (f2) {
        importedOrderDbId = f2.id;
        log(
          'Order after import (user)',
          true,
          `id=${f2.id} status=${f2.status}`
        );
      } else {
        log('Order after import', false, 'không thấy order trong list');
      }
    }
  }

  // 6. Hold — if pending, approve; if already held, skip
  {
    if (!importedOrderDbId) {
      log('Hold / approve', false, 'no order id');
    } else {
      const list = await api(
        `/api/admin/orders?status=held`,
        { token: adminToken }
      );
      let held = (list.data.orders || []).find((o) => o.id === importedOrderDbId);
      if (!held) {
        const all = await api('/api/admin/orders', { token: adminToken });
        const o = (all.data.orders || []).find((x) => x.id === importedOrderDbId);
        if (o && o.status !== 'held' && o.status !== 'paid') {
          const { status, data } = await api(
            `/api/admin/orders/${importedOrderDbId}/approve`,
            {
              method: 'POST',
              token: adminToken,
              body: { note: 'E2E approve' },
            }
          );
          log(
            'Approve → hold',
            status === 200,
            data.error || `status=${data.status}`
          );
        } else {
          log('Hold', true, `already ${o?.status || 'held'}`);
        }
      } else {
        log('Hold', true, 'already held after import');
      }
    }
  }

  // 7. Force release hold → paid / balance
  {
    if (!importedOrderDbId) {
      log('Release hold', false, 'no order');
    } else {
      const { status, data } = await api(
        `/api/admin/orders/${importedOrderDbId}/release`,
        { method: 'POST', token: adminToken, body: {} }
      );
      log(
        'Release hold → ví',
        status === 200,
        data.error || `status=${data.status}`
      );
    }
  }

  // 8. Wallet summary
  let balance = 0;
  {
    const { status, data } = await api('/api/wallet/summary', {
      token: userToken,
    });
    balance = Number(data.balance || data.summary?.balance || 0);
    log(
      'Wallet summary',
      status === 200 && balance > 0,
      `balance=${balance} held=${data.heldBalance ?? data.held_balance}`
    );
  }

  // 9. Update bank + withdraw
  let withdrawId;
  {
    // profile bank
    await api('/api/auth/profile', {
      method: 'PUT',
      token: userToken,
      body: {
        bankName: 'MBBank',
        bankAccount: '0123456789',
        bankHolder: name,
        momoPhone: '0901234567',
      },
    });

    const amt = Math.min(balance, 50000);
    if (amt < 50000 && balance < 50000) {
      // lower min for test via admin settings
      await api('/api/admin/settings', {
        method: 'PUT',
        token: adminToken,
        body: { min_withdraw: '1000' },
      });
    }

    const withdrawAmt = balance >= 50000 ? 50000 : Math.floor(balance);
    if (withdrawAmt <= 0) {
      log('Withdraw', false, 'balance=0');
    } else {
      const { status, data } = await api('/api/wallet/withdraw', {
        method: 'POST',
        token: userToken,
        body: {
          amount: withdrawAmt,
          method: 'bank',
          bankName: 'MBBank',
          bankAccount: '0123456789',
          bankHolder: name,
        },
      });
      withdrawId = data.withdrawId;
      log(
        'Withdraw request',
        status === 200 && data.success,
        data.error || `id=${withdrawId} amount=${withdrawAmt}`
      );
    }
  }

  // 10. Admin process withdraw
  {
    if (!withdrawId) {
      log('Admin process withdraw', false, 'no withdraw id');
    } else {
      const { status, data } = await api(
        `/api/admin/withdrawals/${withdrawId}/process`,
        {
          method: 'POST',
          token: adminToken,
          body: { status: 'paid', note: 'E2E paid' },
        }
      );
      log(
        'Admin mark withdraw paid',
        status === 200 && data.success,
        data.error || 'paid'
      );
    }
  }

  // Restore min withdraw
  await api('/api/admin/settings', {
    method: 'PUT',
    token: adminToken,
    body: { min_withdraw: '50000' },
  }).catch(() => {});

  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;
  console.log(`\n——— Kết quả: ${passed} OK / ${failed} FAIL / ${steps.length} steps ———`);
  console.log(`User: ${email} / ${password}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('\n💥 E2E aborted:', e.message);
  process.exit(1);
});
