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
 *   RENDER_API_URL=https://api.hoantien.pro.vn
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
import readline from 'readline';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import { Zalo, LoginQRCallbackEventType } from 'zca-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const envPath = path.join(root, '.env');
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
const YES = args.has('--yes') || args.has('-y');

const RENDER_API = 'https://api.render.com/v1';

/** Runtime Render config (có thể hỏi interactive nếu thiếu) */
const renderCfg = {
  apiKey: (process.env.RENDER_API_KEY || '').trim(),
  serviceId: (process.env.RENDER_SERVICE_ID || '').trim(),
  serviceName: (process.env.RENDER_SERVICE_NAME || 'hoantienvn-api').trim(),
  publicApi: (
    process.env.RENDER_API_URL ||
    process.env.PUBLIC_API_URL ||
    'https://api.hoantien.pro.vn'
  ).replace(/\/$/, ''),
};

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

function createRl() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl, question, defaultValue = '') {
  const hint = defaultValue ? ` [${defaultValue}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${hint}: `, (ans) => {
      const v = String(ans || '').trim();
      resolve(v || defaultValue);
    });
  });
}

function askYesNo(rl, question, defaultYes = true) {
  const d = defaultYes ? 'Y/n' : 'y/N';
  return new Promise((resolve) => {
    rl.question(`${question} (${d}): `, (ans) => {
      const v = String(ans || '').trim().toLowerCase();
      if (!v) return resolve(defaultYes);
      resolve(v === 'y' || v === 'yes' || v === '1' || v === 'có' || v === 'co');
    });
  });
}

/** Ghi / cập nhật key trong backend/.env (không in value ra log) */
function upsertEnvFile(pairs) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (content && !content.endsWith('\n')) content += '\n';
  for (const [key, value] of Object.entries(pairs)) {
    if (value === undefined || value === null || value === '') continue;
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(content)) {
      content = content.replace(re, line);
    } else {
      content += `${line}\n`;
    }
  }
  fs.writeFileSync(envPath, content, 'utf8');
}

async function validateRenderKey(key) {
  const res = await fetch(`${RENDER_API}/owners`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API key không hợp lệ (${res.status}): ${t.slice(0, 120)}`);
  }
  return true;
}

async function listRenderServices(key) {
  const res = await fetch(`${RENDER_API}/services?limit=50`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : [];
  } catch {
    body = [];
  }
  if (!res.ok) {
    throw new Error(`List services fail ${res.status}`);
  }
  const items = Array.isArray(body) ? body : body?.data || [];
  const out = [];
  for (const row of items) {
    const svc = row.service || row;
    if (svc?.id && svc?.name) {
      out.push({
        id: svc.id,
        name: svc.name,
        type: svc.type || svc.serviceDetails?.type || '',
      });
    }
  }
  return out;
}

/**
 * Nếu thiếu RENDER_API_KEY → hỏi kết nối Render (trừ --local-only / từ chối).
 */
async function ensureRenderConnection() {
  if (LOCAL_ONLY) return false;
  if (renderCfg.apiKey) {
    ok('Đã có RENDER_API_KEY trong env');
    return true;
  }

  log('Render', 'Chưa có RENDER_API_KEY — mở trình duyệt để lấy key…');

  if (!process.stdin.isTTY && !YES) {
    warn('Không phải interactive terminal — bỏ qua hỏi Render');
    warn('Chạy lại trong PowerShell/CMD hoặc set RENDER_API_KEY trong .env');
    return false;
  }

  const rl = createRl();
  try {
    const want = YES
      ? true
      : await askYesNo(rl, 'Kết nối Render API để auto push session?', true);
    if (!want) {
      warn('Bỏ qua Render — chỉ local B64 + clipboard');
      return false;
    }

    // Tự mở trang API Keys trên trình duyệt mặc định
    console.log('\n  → Đang mở trình duyệt: trang Render API Keys…');
    const opened = openBrowser(RENDER_API_KEYS_URL);
    if (opened) {
      ok(`Đã mở: ${RENDER_API_KEYS_URL}`);
    } else {
      warn('Không mở được browser — vào tay:');
      console.log(`     ${RENDER_API_KEYS_URL}`);
    }
    console.log(`
  Trên trang vừa mở:
  1) Đăng nhập Render (nếu chưa)
  2) Create API Key → đặt tên (vd. hoantienvn-zca)
  3) Copy key (rnd_...) → quay lại terminal dán vào đây
`);

    // Gợi ý mở dashboard services nếu cần chọn service sau
    const openDash = YES
      ? false
      : await askYesNo(
          rl,
          'Mở thêm Dashboard services (nếu cần xem srv-id)?',
          false
        );
    if (openDash) {
      openBrowser(RENDER_DASHBOARD_URL);
      ok(`Đã mở: ${RENDER_DASHBOARD_URL}`);
    }

    let key = '';
    for (let i = 0; i < 3; i++) {
      key = await ask(rl, 'Dán RENDER_API_KEY vừa copy (rnd_...)');
      if (!key) {
        warn('Trống — thử lại (hoặc Enter trống rồi Ctrl+C để hủy)');
        // Mở lại browser nếu user chưa lấy được key
        if (i === 1) {
          console.log('  → Mở lại trang API Keys…');
          openBrowser(RENDER_API_KEYS_URL);
        }
        continue;
      }
      try {
        process.stdout.write('  Đang kiểm tra key… ');
        await validateRenderKey(key);
        console.log('OK');
        break;
      } catch (e) {
        console.log('FAIL');
        fail(e.message);
        key = '';
        console.log('  → Mở lại trang API Keys để tạo key mới…');
        openBrowser(RENDER_API_KEYS_URL);
      }
    }
    if (!key) {
      warn('Không lấy được API key hợp lệ');
      return false;
    }
    renderCfg.apiKey = key;

    // Service
    let services = [];
    try {
      services = await listRenderServices(key);
    } catch (e) {
      warn(`List services: ${e.message}`);
    }

    if (services.length) {
      console.log('\n  Services trên account:');
      services.forEach((s, i) => {
        console.log(`    [${i + 1}] ${s.name}  (${s.id})  ${s.type || ''}`);
      });
      const pick = await ask(
        rl,
        `Chọn số 1-${services.length}, hoặc dán srv-xxx / tên service`,
        '1'
      );
      if (/^\d+$/.test(pick)) {
        const idx = parseInt(pick, 10) - 1;
        if (services[idx]) {
          renderCfg.serviceId = services[idx].id;
          renderCfg.serviceName = services[idx].name;
        }
      } else if (pick.startsWith('srv-')) {
        renderCfg.serviceId = pick;
        const found = services.find((s) => s.id === pick);
        if (found) renderCfg.serviceName = found.name;
      } else if (pick) {
        renderCfg.serviceName = pick;
        const found = services.find(
          (s) => s.name.toLowerCase() === pick.toLowerCase()
        );
        if (found) renderCfg.serviceId = found.id;
      }
    } else {
      const sid = await ask(
        rl,
        'Service ID (srv-...) hoặc tên',
        renderCfg.serviceName || 'hoantienvn-api'
      );
      if (sid.startsWith('srv-')) renderCfg.serviceId = sid;
      else renderCfg.serviceName = sid;
    }

    const apiUrl = await ask(
      rl,
      'Public API URL (health/status)',
      renderCfg.publicApi
    );
    if (apiUrl) renderCfg.publicApi = apiUrl.replace(/\/$/, '');

    const save = YES
      ? true
      : await askYesNo(
          rl,
          'Lưu RENDER_* vào backend/.env cho lần sau?',
          true
        );
    if (save) {
      upsertEnvFile({
        RENDER_API_KEY: renderCfg.apiKey,
        RENDER_SERVICE_ID: renderCfg.serviceId || '',
        RENDER_SERVICE_NAME: renderCfg.serviceName || 'hoantienvn-api',
        RENDER_API_URL: renderCfg.publicApi,
      });
      ok(`Đã lưu Render config → ${envPath}`);
      warn('File .env đã trong .gitignore — đừng commit');
    }

    ok(
      `Render sẵn sàng: service=${renderCfg.serviceName || renderCfg.serviceId}`
    );
    return true;
  } finally {
    rl.close();
  }
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

/** Mở URL trên trình duyệt mặc định (Windows/macOS/Linux) */
function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      // start "" "url" — empty title required
      spawn('cmd', ['/c', 'start', '', url], {
        detached: true,
        stdio: 'ignore',
        shell: false,
      }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
    return true;
  } catch {
    return false;
  }
}

const RENDER_API_KEYS_URL =
  'https://dashboard.render.com/u/settings#api-keys';
const RENDER_DASHBOARD_URL = 'https://dashboard.render.com/';

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
      Authorization: `Bearer ${renderCfg.apiKey}`,
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
  if (renderCfg.serviceId) return renderCfg.serviceId;
  log('4a', `Tìm service name="${renderCfg.serviceName}"…`);
  const list = await renderFetch('/services?limit=50');
  const items = Array.isArray(list) ? list : list?.data || [];
  for (const row of items) {
    const svc = row.service || row;
    const name = svc?.name || svc?.serviceDetails?.name;
    const id = svc?.id;
    if (name === renderCfg.serviceName && id) {
      ok(`Found ${name} → ${id}`);
      renderCfg.serviceId = id;
      return id;
    }
  }
  for (const row of items) {
    const svc = row.service || row;
    const name = String(svc?.name || '');
    const id = svc?.id;
    if (id && name.toLowerCase().includes('hoantien')) {
      ok(`Found fuzzy ${name} → ${id}`);
      renderCfg.serviceId = id;
      renderCfg.serviceName = name;
      return id;
    }
  }
  throw new Error(
    `Không tìm service "${renderCfg.serviceName}". Set RENDER_SERVICE_ID=srv-...`
  );
}

async function pushToRender(b64) {
  log('4/5', 'Cập nhật env Render (ZCA_SESSION_B64)…');
  if (!renderCfg.apiKey) {
    warn('Chưa kết nối Render — bỏ qua auto push');
    console.log(`
  Làm tay:
  1) Dashboard Render → ${renderCfg.serviceName} → Environment
  2) ZCA_SESSION_B64 = (đã copy clipboard / file ${b64Path})
  3) ZCA_ENABLED=1
  4) Save → Deploy
`);
    return { pushed: false };
  }

  const serviceId = await resolveServiceId();
  ok(`Service ID: ${serviceId}`);

  const existing = await renderFetch(`/services/${serviceId}/env-vars`);
  const rows = Array.isArray(existing) ? existing : existing?.envVars || [];
  const map = new Map();
  for (const row of rows) {
    const ev = row.envVar || row;
    if (ev?.key) map.set(ev.key, ev.value ?? '');
  }

  map.set('ZCA_SESSION_B64', b64);
  map.set('ZCA_ENABLED', '1');
  if (
    process.env.ZCA_ALLOW_GROUP === '1' ||
    process.env.ZCA_ALLOW_GROUP === 'true'
  ) {
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
  const base = renderCfg.publicApi;
  log('5/5', `Poll ${base}/api/zalo/personal/status …`);
  console.log(
    '     (Deploy Render ~2–5 phút. Nếu enabled=false → bật trong Admin, không phải lỗi session.)'
  );
  const start = Date.now();
  let n = 0;
  let sawCredsOff = false;
  let sawEnabledOff = false;
  while (Date.now() - start < maxMs) {
    n += 1;
    try {
      const res = await fetch(`${base}/api/zalo/personal/status`, {
        signal: AbortSignal.timeout(25000),
      });
      const j = await res.json();
      const line = `     #${n} enabled=${j.enabled} online=${j.online} creds=${j.hasCredentials} group=${j.allowGroup}`;
      console.log(line);
      if (j.online && j.enabled) {
        ok('Production Zalo personal ONLINE 🎉');
        return j;
      }
      if (j.hasCredentials && !j.enabled) {
        sawEnabledOff = true;
        if (n === 3 || n === 8) {
          warn(
            'Session đã có (creds=true) nhưng bot TẮT trong Admin (enabled=false).'
          );
          console.log(
            '     → https://hoantienvn.vercel.app/admin → tab Zalo Bot → Bật bot'
          );
          console.log(
            '     (Hoặc Cấu hình: zalo_personal_enabled=1 rồi Lưu)'
          );
        }
      }
      if (!j.hasCredentials) sawCredsOff = true;
    } catch (e) {
      console.log(`     #${n} wait… (${e.message})`);
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  if (sawEnabledOff) {
    warn('Dừng poll: session OK nhưng Admin chưa BẬT bot.');
    console.log(`
  Làm ngay (1 click):
  1) https://hoantienvn.vercel.app/admin
  2) Tab « Zalo Bot »
  3) Nút « Bật bot »
  4) F5 status: ${base}/api/zalo/personal/status  → online=true
`);
  } else if (sawCredsOff) {
    warn('Chưa thấy credentials — deploy có thể chưa xong / env chưa apply.');
  } else {
    warn('Hết thời gian poll — xem log Render');
  }
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

  // Local .env: tắt bot local (tránh cướp listener production)
  try {
    upsertEnvFile({ ZCA_ENABLED: '0' });
    ok('Local .env: ZCA_ENABLED=0 (tránh cướp listener Render)');
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

  // Hỏi kết nối Render nếu chưa có API key
  await ensureRenderConnection();

  const push = await pushToRender(b64);
  if (push.pushed) {
    await pollOnline();
  }

  console.log('\n── Xong ──');
  console.log('• Session local:', sessionPath);
  console.log('• B64 file:    ', b64Path);
  console.log(
    '• Status URL:  ',
    `${renderCfg.publicApi}/api/zalo/personal/status`
  );
  console.log('• Admin:       ', 'https://hoantienvn.vercel.app/admin → Zalo Bot');
  console.log(
    '• Nhắc: đóng Zalo Web acc bot · chỉ Render chạy listener\n'
  );
}

main().catch((e) => {
  console.error('\n❌ zca-refresh failed:', e.message);
  process.exit(1);
});
