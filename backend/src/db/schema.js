/**
 * Database — Supabase Postgres (DATABASE_URL) hoặc SQLite local (fallback)
 * API: one / many / run / withTransaction / getSetting / setSetting
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const isPostgres = Boolean(
  process.env.DATABASE_URL && process.env.DATABASE_URL.trim()
);

let sqlite = null;
/** Sync settings cache — load sau initDb */
let settingsMap = {};

async function loadSqlite() {
  if (sqlite) return sqlite;
  const { default: Database } = await import('better-sqlite3');
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  sqlite = new Database(path.join(dataDir, 'cashback.db'));
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return sqlite;
}

export async function one(sql, params = []) {
  if (isPostgres) {
    const pg = await import('./pg.js');
    return pg.one(sql, params);
  }
  const db = await loadSqlite();
  return db.prepare(sql).get(...params) || null;
}

export async function many(sql, params = []) {
  if (isPostgres) {
    const pg = await import('./pg.js');
    return pg.many(sql, params);
  }
  const db = await loadSqlite();
  return db.prepare(sql).all(...params);
}

export async function run(sql, params = []) {
  if (isPostgres) {
    const pg = await import('./pg.js');
    return pg.run(sql, params);
  }
  const db = await loadSqlite();
  const info = db.prepare(sql).run(...params);
  return {
    changes: info.changes,
    lastInsertRowid: Number(info.lastInsertRowid),
    rows: [],
  };
}

export async function withTransaction(fn) {
  if (isPostgres) {
    const pg = await import('./pg.js');
    return pg.withTransaction(async (tx) =>
      fn({
        one: (s, p) => tx.one(s, p),
        many: (s, p) => tx.many(s, p),
        run: (s, p) => tx.run(s, p),
      })
    );
  }
  const db = await loadSqlite();
  db.exec('BEGIN');
  try {
    const api = {
      one: async (s, p = []) => db.prepare(s).get(...(p || [])) || null,
      many: async (s, p = []) => db.prepare(s).all(...(p || [])),
      run: async (s, p = []) => {
        const info = db.prepare(s).run(...(p || []));
        return {
          changes: info.changes,
          lastInsertRowid: Number(info.lastInsertRowid),
        };
      },
    };
    const result = await fn(api);
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Sync — sau initDb */
export function getSetting(key, fallback = null) {
  if (Object.prototype.hasOwnProperty.call(settingsMap, key)) {
    return settingsMap[key];
  }
  return fallback;
}

export async function setSetting(key, value) {
  const v = String(value);
  if (isPostgres) {
    await run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, v]
    );
  } else {
    await run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, v]
    );
  }
  settingsMap[key] = v;
}

export async function getAllSettings() {
  const rows = await many('SELECT key, value FROM settings');
  settingsMap = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...settingsMap };
}

export async function reloadSettings() {
  await getAllSettings();
}

export function sqlNow() {
  return isPostgres ? 'NOW()' : "datetime('now')";
}

export function sqlNowPlusDays(days) {
  const d = parseInt(days, 10) || 7;
  return isPostgres
    ? `(NOW() + INTERVAL '${d} days')`
    : `datetime('now', '+${d} days')`;
}

export function sqlNowMinusDays(days) {
  const d = parseInt(days, 10) || 7;
  return isPostgres
    ? `(NOW() - INTERVAL '${d} days')`
    : `datetime('now', '-${d} days')`;
}

export function sqlNowMinusSeconds(sec) {
  const s = parseInt(sec, 10) || 60;
  return isPostgres
    ? `(NOW() - INTERVAL '${s} seconds')`
    : `datetime('now', '-${s} seconds')`;
}

export function sqlStartOfDay() {
  return isPostgres
    ? `date_trunc('day', NOW())`
    : `datetime('now', 'start of day')`;
}

export async function initDb() {
  if (isPostgres) {
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const pg = await import('./pg.js');
    await pg.getPool().query(sql);
  } else {
    await initSqliteTables();
  }
  await seedDefaults();
  await reloadSettings();
  console.log(
    `[db] engine=${isPostgres ? 'supabase/postgres' : 'sqlite-local'}`
  );
}

async function initSqliteTables() {
  const db = await loadSqlite();
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sqlite.sql'), 'utf8'));
  // migrate cột mới
  for (const sql of [
    'ALTER TABLE users ADD COLUMN marketing_opt_in INTEGER DEFAULT 1',
    'ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN google_id TEXT',
    "ALTER TABLE blog_posts ADD COLUMN category TEXT DEFAULT 'Tin tức'",
  ]) {
    try {
      db.exec(sql);
    } catch {
      /* already exists */
    }
  }
}

async function seedDefaults() {
  const defaults = {
    mode: 'no_api',
    cashback_share_ratio: process.env.CASHBACK_SHARE_RATIO || '0.70',
    default_commission_rate: process.env.DEFAULT_COMMISSION_RATE || '0.12',
    f1_rate: process.env.F1_COMMISSION_RATE || '0.20',
    f2_rate: process.env.F2_COMMISSION_RATE || '0.10',
    guide_video_url: process.env.GUIDE_VIDEO_URL || '',
    support_facebook: process.env.SUPPORT_FACEBOOK || '',
    support_messenger: process.env.SUPPORT_MESSENGER || '',
    google_client_id: process.env.GOOGLE_CLIENT_ID || '',
    min_withdraw: process.env.MIN_WITHDRAW || '50000',
    site_name: 'HoanTienVN',
    redirect_mode: process.env.REDIRECT_MODE || 'shopee_an_redir',
    affiliate_wrapper: process.env.AFFILIATE_WRAPPER || '',
    shopee_affiliate_id: process.env.SHOPEE_AFFILIATE_ID || '',
    auto_approve_claims: '0',
    hold_days: process.env.HOLD_DAYS || '7',
    claim_guide:
      'Mua qua link (sub_id = mã user). Admin import báo cáo Shopee → đơn tự vào.',
    sub_id_format: 'user_code',
    max_claims_per_day: '10',
    require_click_before_claim: '0',
    hard_block_no_click: '0',
    min_account_age_hours: '0',
    claim_click_window_days: '14',
    telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
    telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '',
    telegram_bot_enabled: process.env.TELEGRAM_BOT_ENABLED || '1',
    telegram_mode: process.env.TELEGRAM_MODE || 'polling',
    telegram_welcome:
      'Chào bạn! Bot HoanTienVN — dán link Shopee để lấy link hoàn tiền.',
    admin_bank_bin: process.env.ADMIN_BANK_BIN || '970422',
    admin_bank_account: process.env.ADMIN_BANK_ACCOUNT || '',
    admin_bank_name: process.env.ADMIN_BANK_NAME || 'MBBank',
    admin_bank_holder: process.env.ADMIN_BANK_HOLDER || '',
    support_zalo: '',
    support_phone: '',
    support_email: 'hotro@hoantien.vn',
    gsc_verification: process.env.GSC_VERIFICATION || '',
    enable_shopee: '1',
    enable_tiktok: '1',
    enable_lazada: '1',
    site_url:
      process.env.SITE_URL || process.env.PUBLIC_URL || 'http://localhost:5173',
    zalo_oa_access_token: '',
    zalo_bot_enabled: '0',
    zalo_webhook_verify: 'hoantienvn',
    zalo_welcome: 'Chào bạn! Bot HoanTienVN.',
    /** zca-js personal (unofficial) — prefer env ZCA_ENABLED */
    zalo_personal_enabled: process.env.ZCA_ENABLED === '1' ? '1' : '0',
    zalo_personal_allow_group: process.env.ZCA_ALLOW_GROUP === '1' ? '1' : '0',
  };

  for (const [k, v] of Object.entries(defaults)) {
    const existing = await one('SELECT key FROM settings WHERE key = ?', [k]);
    if (!existing) await setSetting(k, v);
  }

  if (process.env.SHOPEE_AFFILIATE_ID) {
    await setSetting('shopee_affiliate_id', process.env.SHOPEE_AFFILIATE_ID);
  }
  if (process.env.TELEGRAM_BOT_TOKEN) {
    await setSetting('telegram_bot_token', process.env.TELEGRAM_BOT_TOKEN);
  }
  if (process.env.TELEGRAM_CHAT_ID) {
    await setSetting('telegram_chat_id', process.env.TELEGRAM_CHAT_ID);
  }
  if (process.env.REDIRECT_MODE) {
    await setSetting('redirect_mode', process.env.REDIRECT_MODE);
  }

  const hasHuong = await one(
    `SELECT id FROM rate_cards WHERE keyword LIKE ? LIMIT 1`,
    ['%tinh dầu%']
  );
  if (!hasHuong) {
    await run(
      `DELETE FROM rate_cards WHERE platform IN ('shopee','tiktok','lazada')`
    );
    const cards = [
      ['shopee', 'tinh dầu|nước hoa|thơm phòng|thơm xe|sáp thơm', 'Hương & Tinh dầu', 0.15, 1],
      ['shopee', 'mỹ phẩm|skincare|son|kem|dưỡng da|serum', 'Mỹ phẩm', 0.18, 2],
      ['shopee', 'điện thoại|tai nghe|sạc|cáp sạc|ốp lưng', 'Điện tử', 0.1, 3],
      ['shopee', 'gia dụng|bếp|nồi|chảo', 'Gia dụng', 0.12, 4],
      ['shopee', 'thời trang|áo thun|quần jean|váy|giày', 'Thời trang', 0.15, 5],
      ['tiktok', 'default', 'TikTok mặc định', 0.1, 1],
      ['lazada', 'default', 'Lazada mặc định', 0.08, 1],
    ];
    for (const c of cards) {
      await run(
        `INSERT INTO rate_cards (platform, keyword, label, commission_rate, sort_order) VALUES (?, ?, ?, ?, ?)`,
        c
      );
    }
  }

  const blogCount = await one('SELECT COUNT(*) as c FROM blog_posts');
  if (Number(blogCount?.c || 0) === 0) {
    await run(
      `INSERT INTO blog_posts (slug, title, excerpt, content) VALUES (?, ?, ?, ?)`,
      [
        'cach-nhan-hoan-tien-shopee',
        'Cách nhận hoàn tiền Shopee 3 bước',
        'Lấy link an_redir và nhận cashback.',
        '## Bước 1\nDán link Shopee.\n\n## Bước 2\nClick mua.\n\n## Bước 3\nImport báo cáo → hold → ví.',
      ]
    );
  }
}
