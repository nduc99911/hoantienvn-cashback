/**
 * HoanTienVN · Tool tự động refresh session Zalo personal (zca-js)
 *
 * Quy trình:
 *  1) QR login (ACC PHỤ)
 *  2) Lưu data/zca-session.json
 *  3) Encode base64 → clipboard + file
 *  4) (tuỳ chọn) Cập nhật env Render + trigger deploy
 *  5) (tuỳ chọn) Poll /api/zalo/personal/status đến khi online
 *
 * Chạy:
 *   cd backend
 *   npm run zca:refresh
 *
 * Chỉ login + B64 (không đụng Render):
 *   npm run zca:refresh -- --local-only
 *
 * Dùng session file sẵn (bỏ QR):
 *   npm run zca:refresh -- --reuse-session
 *
 * Env (backend/.env hoặc shell):
 *   RENDER_API_KEY=rnd_...
 *   RENDER_SERVICE_ID=srv-...     (hoặc RENDER_SERVICE_NAME=hoantienvn-api)
 *   RENDER_API_URL=https://hoantienvn-api.onrender.com
 *   ZCA_ALLOW_GROUP=1             (khi push lên Render)
 *
 * Lấy API key: https://dashboard.render.com/u/settings#api-keys
 * Service ID: Dashboard → service → URL có srv-xxxxx
 *
 * ⚠️ Unofficial · ban risk · không commit session · 1 listener / 1 acc
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import { Zalo, LoginQRCallbackEventType } from 'zca-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const sessionPath =
  process.env.ZCA_SESSION_PATH || path.join(dataDir, 'zca-session.json');
const qrPath = path.join(dataDir, 'zca-qr.png');
const b64Path = path.join(dataDir, 'zca-session.b64.txt');

const args = new Set(process.argv.slice(2));
const LOCAL_ONLY = args.has('--local-only') || args.has('-l');
const REUSE = args.has('--reuse-session') || args.has('--reuse');
const NO_DEPLOY = args.has('--no-deploy');
const NO_POLL = args.has('--no-poll');
const OPEN_QR = !args.has('--no-open-qr');

const RENDER_API = 'https://api.render.com/v1';
const apiKey = (process.env.RENDER_API_KEY || '').trim();
const serviceIdEnv = (process.env.RENDER_SERVICE_ID || '').trim();
const serviceName = (
  process.env.RENDER_SERVICE_NAME ||
  'hoantienvn-api'
).trim();
const publicApi = (
  process.env.RENDER_API_URL ||
  process.env.PUBLIC_API_URL ||
  'https://hoantienvn-api.onrender.com'
).replace(/\/$/, '');

function log(step, msg) {
  console.log(`\n[${step}] ${msg}`);
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

function warn(msg) {
  console.log(`  ⚠️  ${msg}`);
}

function fail(msg) {
  console.error(`  ❌ ${msg}`);
}

function copyClipboard(text) {
  try {
    if (process.platform === 'win32') {
      // PowerShell Set-Clipboard (Unicode-safe hơn clip)
      const ps = spawn(
        'powershell',
        ['-NoProfile', '-Command', 'Set-Clipboard -Value $input'],
        { stdio: ['pipe', 'ignore', 'pipe'] }
      );
      ps.stdin.write(text, 'utf8');
      ps.stdin.end();
      return new Promise((resolve) => {
        ps.on('close', (code) => resolve(code === 0));
      });
    }
    if (process.platform === 'darwin') {
      execSync('pbcopy', { input: text });
      return true;
    }
    execSync('xclip -selection clipboard', { input: text });
    return true;
  } catch {
    return false;
  }
}

function openFile(filePath) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', filePath], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [filePath], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [filePath], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {
    /* ignore */
  }
}

async function loginQr() {
  log('1/5', 'Đăng nhập Zalo bằng QR (ACC PHỤ)…');
  console.log('     Session →', sessionPath);
  console.log('     QR ảnh  →', qrPath);
  console.log('     Mở Zalo app → Quét QR khi hiện ra\n');

  fs.mkdirSync(dataDir, { recursive: true });

  const zalo = new Zalo({ logging: process.env.ZCA_DEBUG === '1' });
  let savedCreds = null;

  const api = await zalo.loginQR({}, (event) => {
    switch (event.type) {
      case LoginQRCallbackEventType.QRCodeGenerated: {
        const d = event.data || {};
        if (d.image) {
          try {
            const buf = Buffer.from(
              String(d.image).replace(/^data:image\/\w+;base64,/, ''),
              'base64'
            );
            fs.writeFileSync(qrPath, buf);
            ok(`Đã ghi QR: ${qrPath}`);
            if (OPEN_QR) openFile(qrPath);
          } catch (e) {
            warn(`Không ghi QR image: ${e.message}`);
          }
        }
        if (event.actions?.saveToFile) {
          try {
            event.actions.saveToFile(qrPath);
            ok(`saveToFile QR: ${qrPath}`);
            if (OPEN_QR) openFile(qrPath);
          } catch {
            /* optional */
          }
        }
        console.log('     ⏳ Chờ bạn quét QR trên điện thoại…');
        break;
      }
      case LoginQRCallbackEventType.QRCodeScanned:
        ok('Đã quét — xác nhận trên điện thoại…');
        break;
      case LoginQRCallbackEventType.QRCodeExpired:
        fail('QR hết hạn — chạy lại npm run zca:refresh');
        break;
      case LoginQRCallbackEventType.QRCodeDeclined:
        fail('Từ chối trên điện thoại');
        break;
      case LoginQRCallbackEventType.GotLoginInfo: {
        const info = event.data;
        if (info?.cookie && info?.imei && info?.userAgent) {
          savedCreds = {
            cookie: info.cookie,
            imei: info.imei,
            userAgent: info.userAgent,
            language: 'vi',
            savedAt: new Date().toISOString(),
            warning: 'SECRET — do not commit. Secondary account only.',
          };
        }
        break;
      }
      default:
        break;
    }
  });

  if (!savedCreds) {
    // fallback: reconstruct from cookie jar if callback missed
    fail('Không lấy được credentials từ callback — thử lại');
    throw new Error('Missing login credentials');
  }

  fs.writeFileSync(sessionPath, JSON.stringify(savedCreds, null, 2), 'utf8');
  ok(`Session saved: ${sessionPath}`);

  let uid = '?';
  try {
    if (typeof api.getOwnId === 'function') uid = await api.getOwnId();
  } catch {
    /* ignore */
  }
  ok(`Logged in uid=${uid}`);

  // Đóng API local ngay — tránh cướp listener production
  try {
    if (api?.listener?.stop) api.listener.stop();
  } catch {
    /* ignore */
  }

  return { creds: savedCreds, uid };
}

function loadExistingSession() {
  if (!fs.existsSync(sessionPath)) {
    throw new Error(`Không có session: ${sessionPath} — bỏ --reuse-session`);
  }
  const j = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  if (!j.cookie || !j.imei || !j.userAgent) {
    throw new Error('Session file thiếu cookie/imei/userAgent');
  }
  return j;
}

function toB64(sessionObjOrPath) {
  let raw;
  if (typeof sessionObjOrPath === 'string') {
    raw = fs.readFileSync(sessionObjOrPath);
  } else {
    raw = Buffer.from(JSON.stringify(sessionObjOrPath));
  }
  // Prefer file on disk (pretty JSON) for stable B64 from sessionPath
  if (fs.existsSync(sessionPath)) {
    raw = fs.readFileSync(sessionPath);
  }
  return Buffer.from(raw).toString('base64');
}

async function renderFetch(pathname, opts = {}) {
  const res = await fetch(`${RENDER_API}${pathname}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === 'object'
        ? body?.message || JSON.stringify(body).slice(0, 300)
        : String(body).slice(0, 300);
    throw new Error(`Render API ${res.status}: ${msg}`);
  }
  return body;
}

async function resolveServiceId() {
  if (serviceIdEnv) return serviceIdEnv;
  log('4a', `Tìm service name="${serviceName}"…`);
  const list = await renderFetch('/services?limit=50');
  const items = Array.isArray(list) ? list : list?.data || [];
  for (const row of items) {
    const svc = row.service || row;
    const name = svc?.name || svc?.serviceDetails?.name;
    const id = svc?.id;
    if (name === serviceName && id) {
      ok(`Found ${name} → ${id}`);
      return id;
    }
  }
  // fuzzy
  for (const row of items) {
    const svc = row.service || row;
    const name = String(svc?.name || '');
    const id = svc?.id;
    if (id && name.toLowerCase().includes('hoantien')) {
      ok(`Found fuzzy ${name} → ${id}`);
      return id;
    }
  }
  throw new Error(
    `Không tìm service "${serviceName}". Set RENDER_SERVICE_ID=srv-...`
  );
}

async function pushToRender(b64) {
  log('4/5', 'Cập nhật env Render (ZCA_SESSION_B64)…');
  if (!apiKey) {
    warn('Chưa có RENDER_API_KEY — bỏ qua auto push');
    console.log(`
  Làm tay:
  1) Dashboard Render → ${serviceName} → Environment
  2) ZCA_SESSION_B64 = (đã copy clipboard / file ${b64Path})
  3) ZCA_ENABLED=1
  4) Save → Deploy
`);
    return { pushed: false };
  }

  const serviceId = await resolveServiceId();
  ok(`Service ID: ${serviceId}`);

  // List existing env vars — PUT replaces all, phải merge
  const existing = await renderFetch(`/services/${serviceId}/env-vars`);
  const rows = Array.isArray(existing) ? existing : existing?.envVars || [];
  const map = new Map();
  for (const row of rows) {
    const ev = row.envVar || row;
    if (ev?.key) map.set(ev.key, ev.value ?? '');
  }

  map.set('ZCA_SESSION_B64', b64);
  map.set('ZCA_ENABLED', '1');
  if (process.env.ZCA_ALLOW_GROUP === '1' || process.env.ZCA_ALLOW_GROUP === 'true') {
    map.set('ZCA_ALLOW_GROUP', '1');
  }

  const payload = [...map.entries()].map(([key, value]) => ({ key, value }));
  await renderFetch(`/services/${serviceId}/env-vars`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  ok(`Đã PUT ${payload.length} env vars (merged + ZCA_SESSION_B64)`);

  if (!NO_DEPLOY) {
    log('4b', 'Trigger deploy…');
    try {
      const dep = await renderFetch(`/services/${serviceId}/deploys`, {
        method: 'POST',
        body: JSON.stringify({ clearCache: 'do_not_clear' }),
      });
      const deployId = dep?.id || dep?.deploy?.id || '?';
      ok(`Deploy started: ${deployId}`);
    } catch (e) {
      warn(`Deploy trigger fail (env có thể đã lưu): ${e.message}`);
    }
  } else {
    warn('Bỏ deploy (--no-deploy). Restart service thủ công nếu cần.');
  }

  return { pushed: true, serviceId };
}

async function pollOnline(maxMs = 6 * 60 * 1000) {
  if (NO_POLL) return;
  log('5/5', `Poll ${publicApi}/api/zalo/personal/status …`);
  const start = Date.now();
  let n = 0;
  while (Date.now() - start < maxMs) {
    n += 1;
    try {
      const res = await fetch(`${publicApi}/api/zalo/personal/status`, {
        signal: AbortSignal.timeout(25000),
      });
      const j = await res.json();
      const line = `     #${n} enabled=${j.enabled} online=${j.online} creds=${j.hasCredentials} group=${j.allowGroup}`;
      console.log(line);
      if (j.online && j.enabled) {
        ok('Production Zalo personal ONLINE 🎉');
        return j;
      }
    } catch (e) {
      console.log(`     #${n} wait… (${e.message})`);
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  warn('Hết thời gian poll — kiểm tra log Render / Admin → Zalo Bot → Bật bot');
  return null;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  HoanTienVN · zca-refresh (Zalo session)     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('⚠️  Unofficial zca-js · ACC PHỤ · 1 listener only');
  console.log(
    `Mode: ${REUSE ? 'reuse-session' : 'QR login'} | ${LOCAL_ONLY ? 'local-only' : 'push Render nếu có key'}`
  );

  // 1–2 login / reuse
  if (REUSE) {
    log('1/5', 'Dùng session có sẵn…');
    loadExistingSession();
    ok(sessionPath);
  } else {
    await loginQr();
  }

  // 3 B64 + clipboard
  log('3/5', 'Encode base64 + clipboard…');
  const b64 = toB64(sessionPath);
  fs.writeFileSync(b64Path, b64, 'utf8');
  ok(`B64 length=${b64.length} → ${b64Path}`);

  const clipped = await copyClipboard(b64);
  if (clipped) ok('Đã copy ZCA_SESSION_B64 vào clipboard');
  else warn('Không copy clipboard — mở file .b64.txt');

  // Local .env gợi ý (không tự bật bot local — tránh cướp listener)
  try {
    const envPath = path.join(root, '.env');
    if (fs.existsSync(envPath)) {
      let env = fs.readFileSync(envPath, 'utf8');
      // Chỉ đảm bảo local ZCA_ENABLED=0 để không cướp production
      if (/^ZCA_ENABLED=/m.test(env)) {
        env = env.replace(/^ZCA_ENABLED=.*/m, 'ZCA_ENABLED=0');
      } else {
        env = env.trimEnd() + '\nZCA_ENABLED=0\n';
      }
      fs.writeFileSync(envPath, env, 'utf8');
      ok('Local .env: ZCA_ENABLED=0 (tránh cướp listener Render)');
    }
  } catch {
    /* ignore */
  }

  if (LOCAL_ONLY) {
    log('4/5', 'local-only — không push Render');
    console.log(`
  Tiếp theo (tay):
  • Paste clipboard → Render env ZCA_SESSION_B64
  • ZCA_ENABLED=1 → Save/Deploy
  • Admin → Zalo Bot → Bật bot / Restart
`);
    process.exit(0);
  }

  const push = await pushToRender(b64);
  if (push.pushed) {
    await pollOnline();
  }

  console.log('\n── Xong ──');
  console.log('• Session local:', sessionPath);
  console.log('• B64 file:    ', b64Path);
  console.log('• Status URL:  ', `${publicApi}/api/zalo/personal/status`);
  console.log('• Admin:       ', 'https://hoantienvn.vercel.app/admin → Zalo Bot');
  console.log(
    '• Nhắc: đóng Zalo Web acc bot · chỉ Render chạy listener\n'
  );
}

main().catch((e) => {
  console.error('\n❌ zca-refresh failed:', e.message);
  process.exit(1);
});
