/**
 * Case test: liên kết Telegram / Zalo ↔ tài khoản web
 *
 * Quy tắc thiết kế hiện tại:
 *  - 1 Telegram chat_id  → tối đa 1 user web (cột telegram_id)
 *  - 1 Zalo user_id      → tối đa 1 user web (cột zalo_id)
 *  - 1 user web          → tối đa 1 Tele + 1 Zalo (mỗi kênh 1 id)
 *  - Lienket mã mới từ web khác → Tele/Zalo "chuyển" sang web mới (web cũ mất liên kết)
 *
 * Chạy (SQLite tạm, không đụng Supabase production):
 *   node scripts/test-bind-cases.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDb = path.join(__dirname, '../data/test-bind.db');

// Force SQLite test DB
delete process.env.DATABASE_URL;
process.env.SQLITE_PATH = tmpDb;
try {
  fs.unlinkSync(tmpDb);
} catch {
  /* ignore */
}
try {
  fs.unlinkSync(tmpDb + '-wal');
  fs.unlinkSync(tmpDb + '-shm');
} catch {
  /* ignore */
}

const { initDb, one, run, many } = await import('../src/db/schema.js');
const { hashPassword, generateReferralCode } = await import(
  '../src/utils/auth.js'
);
const {
  createTelegramBindCode,
  handleTelegramUpdate,
} = await import('../src/services/telegramBot.js');
const { createBindCode, handleZaloMessage } = await import(
  '../src/services/zaloBot.js'
);

await initDb();

let passed = 0;
let failed = 0;

function ok(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function createWebUser(email, name) {
  let code = generateReferralCode();
  while (await one('SELECT id FROM users WHERE referral_code = ?', [code])) {
    code = generateReferralCode();
  }
  const info = await run(
    `INSERT INTO users (email, password_hash, name, referral_code, role)
     VALUES (?, ?, ?, ?, 'user')`,
    [email, hashPassword('test123'), name, code]
  );
  return one('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid]);
}

async function tgLienket(chatId, code, from = {}) {
  await handleTelegramUpdate({
    message: {
      chat: { id: chatId },
      from: { id: chatId, first_name: from.first_name || 'TG', ...from },
      text: `/lienket ${code}`,
    },
  });
}

async function zaloLienket(zaloId, code, name = 'Zalo User') {
  return handleZaloMessage({
    zaloUserId: String(zaloId),
    text: `lienket ${code}`,
    displayName: name,
  });
}

console.log('\n═══ BIND CASE TESTS (Tele / Zalo ↔ Web) ═══\n');
console.log('DB test:', tmpDb);

// ── Setup web users ──
const webA = await createWebUser('bind_a@test.local', 'Web A');
const webB = await createWebUser('bind_b@test.local', 'Web B');
const webC = await createWebUser('bind_c@test.local', 'Web C');
const TG1 = 900001;
const TG2 = 900002;
const ZALO1 = 'zalo_bind_001';
const ZALO2 = 'zalo_bind_002';

// ═══════════════════════════════════════════
console.log('\n[1] Một web tạo 1 mã → 1 Tele liên kết thành công');
{
  const code = await createTelegramBindCode(webA.id);
  ok('Mã 6 số', /^\d{6}$/.test(code), code);
  await tgLienket(TG1, code, { first_name: 'UserTG1' });
  const a = await one('SELECT * FROM users WHERE id = ?', [webA.id]);
  ok('Web A có telegram_id = TG1', String(a.telegram_id) === String(TG1));
  ok('Mã bind đã xóa (1 lần dùng)', !a.telegram_bind_code);
}

// ═══════════════════════════════════════════
console.log('\n[2] Cùng 1 Tele KHÔNG giữ 2 web cùng lúc (chuyển sang web B)');
{
  // webA đang gắn TG1; webB tạo mã, TG1 lienket B
  const codeB = await createTelegramBindCode(webB.id);
  await tgLienket(TG1, codeB);
  const a = await one('SELECT * FROM users WHERE id = ?', [webA.id]);
  const b = await one('SELECT * FROM users WHERE id = ?', [webB.id]);
  ok('Web A mất telegram_id', !a.telegram_id);
  ok('Web B nhận telegram_id = TG1', String(b.telegram_id) === String(TG1));
  const n = await one(
    'SELECT COUNT(*) as c FROM users WHERE telegram_id = ?',
    [String(TG1)]
  );
  ok('Chỉ 1 user có TG1', Number(n.c) === 1);
}

// ═══════════════════════════════════════════
console.log('\n[3] Một web chỉ giữ 1 Tele (Tele mới ghi đè Tele cũ trên cùng web)');
{
  // webB = TG1; webB tạo mã mới, TG2 lienket webB
  const code = await createTelegramBindCode(webB.id);
  await tgLienket(TG2, code);
  const b = await one('SELECT * FROM users WHERE id = ?', [webB.id]);
  ok('Web B telegram_id = TG2 (ghi đè)', String(b.telegram_id) === String(TG2));
  const orphan = await one('SELECT id FROM users WHERE telegram_id = ?', [
    String(TG1),
  ]);
  ok('TG1 không còn gắn user nào', !orphan);
}

// ═══════════════════════════════════════════
console.log('\n[4] Mã sai / mã đã dùng');
{
  const r1 = await handleTelegramUpdate({
    message: {
      chat: { id: TG1 },
      from: { id: TG1 },
      text: '/lienket 000000',
    },
  });
  // handleTelegramUpdate doesn't return reply text easily - check via zalo style
  const reply = await handleZaloMessage({
    zaloUserId: 'z_probe',
    text: 'lienket 000000',
  });
  ok('Mã không tồn tại → lỗi', /sai|đã dùng|không/i.test(reply || ''));

  const code = await createTelegramBindCode(webC.id);
  await tgLienket(TG1, code);
  // dùng lại mã đã consume
  const before = await one('SELECT telegram_id FROM users WHERE id = ?', [
    webC.id,
  ]);
  await tgLienket(TG2, code); // same code again
  const c = await one('SELECT * FROM users WHERE id = ?', [webC.id]);
  ok(
    'Mã đã dùng không gắn TG2 vào C',
    String(c.telegram_id) === String(before.telegram_id)
  );
}

// ═══════════════════════════════════════════
console.log('\n[5] Mã không đủ 6 số');
{
  const reply = await handleZaloMessage({
    zaloUserId: ZALO1,
    text: 'lienket 123',
  });
  ok('Mã ngắn → báo lỗi 6 số', /6 số|mã/i.test(reply || ''));
}

// ═══════════════════════════════════════════
console.log('\n[6] Zalo: 1 zalo_id → 1 web; chuyển web');
{
  const codeA = await createBindCode(webA.id);
  let reply = await zaloLienket(ZALO1, codeA, 'Z1');
  ok('Zalo liên kết A OK', /đã liên kết/i.test(reply || ''));
  let a = await one('SELECT * FROM users WHERE id = ?', [webA.id]);
  ok('Web A zalo_id = ZALO1', String(a.zalo_id) === String(ZALO1));

  const codeB = await createBindCode(webB.id);
  reply = await zaloLienket(ZALO1, codeB, 'Z1');
  ok('Zalo chuyển sang B OK', /đã liên kết/i.test(reply || ''));
  a = await one('SELECT * FROM users WHERE id = ?', [webA.id]);
  const b = await one('SELECT * FROM users WHERE id = ?', [webB.id]);
  ok('Web A mất zalo', !a.zalo_id);
  ok('Web B có zalo', String(b.zalo_id) === String(ZALO1));
  const n = await one(
    'SELECT COUNT(*) as c FROM users WHERE zalo_id = ?',
    [String(ZALO1)]
  );
  ok('Chỉ 1 user có ZALO1', Number(n.c) === 1);
}

// ═══════════════════════════════════════════
console.log('\n[7] Cùng 1 web: vừa Tele vừa Zalo (2 kênh song song)');
{
  // webC: set TG1 + ZALO2
  const codeTg = await createTelegramBindCode(webC.id);
  await tgLienket(TG1, codeTg);
  const codeZl = await createBindCode(webC.id);
  await zaloLienket(ZALO2, codeZl);
  const c = await one('SELECT * FROM users WHERE id = ?', [webC.id]);
  ok('Web C có telegram', String(c.telegram_id) === String(TG1));
  ok('Web C có zalo', String(c.zalo_id) === String(ZALO2));
  ok(
    'Tele và Zalo độc lập trên cùng web',
    c.telegram_id && c.zalo_id && String(c.telegram_id) !== String(c.zalo_id)
  );
}

// ═══════════════════════════════════════════
console.log('\n[8] Web tạo nhiều mã liên tiếp — chỉ mã mới nhất còn hiệu lực');
{
  const u = await createWebUser('bind_multi@test.local', 'Multi Code');
  const c1 = await createTelegramBindCode(u.id);
  const c2 = await createTelegramBindCode(u.id);
  ok('Mã 1 ≠ mã 2', c1 !== c2);
  const row = await one('SELECT telegram_bind_code FROM users WHERE id = ?', [
    u.id,
  ]);
  ok('DB chỉ giữ mã mới nhất', row.telegram_bind_code === c2);
  // c1 không còn trong DB
  const old = await one(
    'SELECT id FROM users WHERE telegram_bind_code = ?',
    [c1]
  );
  ok('Mã cũ không dùng được', !old);
  await tgLienket(900099, c2);
  const linked = await one('SELECT telegram_id FROM users WHERE id = ?', [u.id]);
  ok('Mã mới liên kết OK', String(linked.telegram_id) === '900099');
}

// ═══════════════════════════════════════════
console.log('\n[9] Tóm tắt quy tắc (expect)');
console.log(`
  ┌─────────────────────┬──────────────────────────────────────┐
  │ Câu hỏi             │ Trả lời (code hiện tại)              │
  ├─────────────────────┼──────────────────────────────────────┤
  │ 1 Tele gắn mấy web? │ 1 web tại 1 thời điểm                │
  │ 1 Zalo gắn mấy web? │ 1 web tại 1 thời điểm                │
  │ 1 web gắn mấy Tele? │ 1 telegram_id                        │
  │ 1 web gắn mấy Zalo? │ 1 zalo_id                            │
  │ 1 web Tele+Zalo?    │ Có — 2 kênh độc lập                  │
  │ Lienket web khác?   │ Có — web cũ mất liên kết kênh đó     │
  │ Mã bind dùng mấy lần│ 1 lần (xóa sau khi gắn)              │
  │ Tạo mã mới?         │ Mã cũ hết hạn, chỉ mã mới dùng được  │
  └─────────────────────┴──────────────────────────────────────┘
`);

// cleanup tmp
try {
  fs.unlinkSync(tmpDb);
} catch {
  /* ignore */
}

console.log(`\n═══ KẾT QUẢ: ${passed} passed · ${failed} failed ═══\n`);
process.exit(failed > 0 ? 1 : 0);
