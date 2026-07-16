import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'cashback.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function hasColumn(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

function addColumnIfMissing(table, column, def) {
  if (!hasColumn(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      referral_code TEXT UNIQUE NOT NULL,
      referred_by INTEGER REFERENCES users(id),
      balance REAL DEFAULT 0,
      pending_balance REAL DEFAULT 0,
      held_balance REAL DEFAULT 0,
      bank_name TEXT,
      bank_account TEXT,
      bank_holder TEXT,
      momo_phone TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cashback_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      platform TEXT DEFAULT 'shopee',
      original_url TEXT NOT NULL,
      affiliate_url TEXT NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      product_name TEXT,
      product_image TEXT,
      product_price REAL,
      commission_rate REAL,
      cashback_rate REAL,
      estimated_cashback REAL,
      sub_id TEXT,
      shop_id TEXT,
      item_id TEXT,
      clicks INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS click_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id INTEGER REFERENCES cashback_links(id),
      user_id INTEGER REFERENCES users(id),
      short_code TEXT,
      platform TEXT DEFAULT 'shopee',
      ip TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      link_id INTEGER REFERENCES cashback_links(id),
      platform TEXT DEFAULT 'shopee',
      order_id TEXT,
      conversion_id TEXT,
      product_name TEXT,
      product_image TEXT,
      order_amount REAL DEFAULT 0,
      total_commission REAL DEFAULT 0,
      cashback_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      source TEXT DEFAULT 'claim',
      claim_note TEXT,
      admin_note TEXT,
      screenshot_url TEXT,
      fraud_score INTEGER DEFAULT 0,
      fraud_flags TEXT,
      hold_until TEXT,
      purchase_time TEXT,
      complete_time TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL,
      status TEXT DEFAULT 'completed',
      reference_type TEXT,
      reference_id INTEGER,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS withdraw_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      bank_name TEXT,
      bank_account TEXT,
      bank_holder TEXT,
      momo_phone TEXT,
      vietqr_url TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rate_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT DEFAULT 'shopee',
      keyword TEXT NOT NULL,
      label TEXT NOT NULL,
      commission_rate REAL NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      role_target TEXT,
      type TEXT,
      title TEXT,
      body TEXT,
      meta TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL,
      cover_url TEXT,
      published INTEGER DEFAULT 1,
      views INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      hits INTEGER DEFAULT 1,
      window_start TEXT DEFAULT (datetime('now'))
    );

  `);

  // Migrations trước khi tạo index cột mới
  addColumnIfMissing('users', 'held_balance', 'REAL DEFAULT 0');
  addColumnIfMissing('users', 'status', "TEXT DEFAULT 'active'");
  addColumnIfMissing('users', 'zalo_id', 'TEXT');
  addColumnIfMissing('users', 'zalo_bind_code', 'TEXT');
  addColumnIfMissing('users', 'zalo_name', 'TEXT');
  addColumnIfMissing('users', 'telegram_id', 'TEXT');
  addColumnIfMissing('users', 'telegram_bind_code', 'TEXT');
  addColumnIfMissing('users', 'telegram_name', 'TEXT');
  addColumnIfMissing('cashback_links', 'platform', "TEXT DEFAULT 'shopee'");
  addColumnIfMissing('cashback_links', 'shop_id', 'TEXT');
  addColumnIfMissing('cashback_links', 'item_id', 'TEXT');
  addColumnIfMissing('click_logs', 'platform', "TEXT DEFAULT 'shopee'");
  addColumnIfMissing('orders', 'platform', "TEXT DEFAULT 'shopee'");
  addColumnIfMissing('orders', 'source', "TEXT DEFAULT 'claim'");
  addColumnIfMissing('orders', 'claim_note', 'TEXT');
  addColumnIfMissing('orders', 'admin_note', 'TEXT');
  addColumnIfMissing('orders', 'screenshot_url', 'TEXT');
  addColumnIfMissing('orders', 'fraud_score', 'INTEGER DEFAULT 0');
  addColumnIfMissing('orders', 'fraud_flags', 'TEXT');
  addColumnIfMissing('orders', 'hold_until', 'TEXT');
  addColumnIfMissing('withdraw_requests', 'vietqr_url', 'TEXT');
  addColumnIfMissing('rate_cards', 'platform', "TEXT DEFAULT 'shopee'");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_hold ON orders(status, hold_until);
    CREATE INDEX IF NOT EXISTS idx_links_user ON cashback_links(user_id);
    CREATE INDEX IF NOT EXISTS idx_links_short ON cashback_links(short_code);
    CREATE INDEX IF NOT EXISTS idx_links_sub ON cashback_links(sub_id);
    CREATE INDEX IF NOT EXISTS idx_tx_user ON wallet_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_ref ON users(referral_code);
    CREATE INDEX IF NOT EXISTS idx_clicks_link ON click_logs(link_id);
    CREATE INDEX IF NOT EXISTS idx_clicks_user ON click_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_rl_key ON rate_limits(key);
    CREATE INDEX IF NOT EXISTS idx_users_zalo ON users(zalo_id);
    CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
  `);

  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO NOTHING`
  );

  const defaults = {
    mode: 'no_api',
    cashback_share_ratio: process.env.CASHBACK_SHARE_RATIO || '0.70',
    default_commission_rate: process.env.DEFAULT_COMMISSION_RATE || '0.12',
    f1_rate: process.env.F1_COMMISSION_RATE || '0.05',
    f2_rate: process.env.F2_COMMISSION_RATE || '0.02',
    min_withdraw: process.env.MIN_WITHDRAW || '50000',
    site_name: 'HoanTienVN',
    redirect_mode: process.env.REDIRECT_MODE || 'shopee_an_redir',
    affiliate_wrapper: process.env.AFFILIATE_WRAPPER || '',
    shopee_affiliate_id: process.env.SHOPEE_AFFILIATE_ID || '17320010599',
    auto_approve_claims: '0',
    hold_days: process.env.HOLD_DAYS || '7',
    claim_guide:
      'Không cần khai báo thường xuyên. Mua qua link (sub_id = mã user). Admin import báo cáo Shopee → đơn tự vào. Chỉ báo thiếu nếu sau 3–7 ngày chưa thấy đơn.',
    sub_id_format: 'user_code', // user_code = U{id}_{REF} | referral_only
    // fraud — nới vì luồng chính là import, claim chỉ fallback
    max_claims_per_day: '10',
    require_click_before_claim: '0',
    min_account_age_hours: '0',
    claim_click_window_days: '14',
    // telegram
    telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
    telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '',
    telegram_bot_enabled: process.env.TELEGRAM_BOT_ENABLED || '1',
    telegram_mode: process.env.TELEGRAM_MODE || 'polling', // polling | webhook
    telegram_welcome:
      'Chào bạn! Bot HoanTienVN — dán link Shopee để lấy link hoàn tiền.',
    // VietQR admin payout display
    admin_bank_bin: process.env.ADMIN_BANK_BIN || '970422',
    admin_bank_account: process.env.ADMIN_BANK_ACCOUNT || '',
    admin_bank_name: process.env.ADMIN_BANK_NAME || 'MBBank',
    admin_bank_holder: process.env.ADMIN_BANK_HOLDER || '',
    support_zalo: process.env.SUPPORT_ZALO || '',
    support_phone: process.env.SUPPORT_PHONE || '',
    support_email: process.env.SUPPORT_EMAIL || 'hotro@hoantien.vn',
    // platforms
    enable_shopee: '1',
    enable_tiktok: '1',
    enable_lazada: '1',
    site_url: process.env.PUBLIC_URL || 'http://localhost:5173',
    // Zalo OA Bot
    zalo_oa_access_token: process.env.ZALO_OA_ACCESS_TOKEN || '',
    zalo_oa_secret: process.env.ZALO_OA_SECRET || '',
    zalo_app_id: process.env.ZALO_APP_ID || '',
    zalo_webhook_verify: process.env.ZALO_WEBHOOK_VERIFY || 'hoantienvn',
    zalo_bot_enabled: process.env.ZALO_BOT_ENABLED || '1',
    zalo_welcome:
      'Chào bạn! Mình là bot HoanTienVN 🛒\nGửi link Shopee để lấy link hoàn tiền.\nGõ MENU để xem lệnh.',
  };

  for (const [k, v] of Object.entries(defaults)) {
    upsert.run(k, v);
  }

  if (process.env.SHOPEE_AFFILIATE_ID) {
    setSetting('shopee_affiliate_id', process.env.SHOPEE_AFFILIATE_ID);
  }
  if (process.env.REDIRECT_MODE) {
    setSetting('redirect_mode', process.env.REDIRECT_MODE);
  }
  // Luồng auto sub_id — nới claim
  setSetting('require_click_before_claim', getSetting('require_click_before_claim', '0') || '0');
  setSetting(
    'claim_guide',
    'Không cần khai báo thường xuyên. Mua qua link (sub_id = mã user). Admin import báo cáo Shopee → đơn tự vào. Chỉ báo thiếu nếu sau 3–7 ngày chưa thấy đơn.'
  );
  setSetting('sub_id_format', getSetting('sub_id_format', 'user_code') || 'user_code');
  if (process.env.TELEGRAM_BOT_TOKEN) {
    setSetting('telegram_bot_token', process.env.TELEGRAM_BOT_TOKEN);
  }
  if (process.env.TELEGRAM_CHAT_ID) {
    setSetting('telegram_chat_id', process.env.TELEGRAM_CHAT_ID);
  }

  const modeNow = getSetting('redirect_mode', 'shopee_an_redir');
  const affId = getSetting('shopee_affiliate_id', '');
  if (affId && modeNow === 'direct') {
    setSetting('redirect_mode', 'shopee_an_redir');
  }

  // Rate cards: refresh nếu thiếu bản "tinh dầu" (bản cũ match nhầm "áo/quần")
  const hasHuong = db
    .prepare(`SELECT id FROM rate_cards WHERE keyword LIKE '%tinh dầu%' LIMIT 1`)
    .get();
  if (!hasHuong) {
    db.prepare(`DELETE FROM rate_cards WHERE platform IN ('shopee','tiktok','lazada')`).run();
    const ins = db.prepare(
      'INSERT INTO rate_cards (platform, keyword, label, commission_rate, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    const cards = [
      ['shopee', 'tinh dầu|nước hoa|thơm phòng|thơm xe|sáp thơm', 'Hương & Tinh dầu', 0.15, 1],
      ['shopee', 'mỹ phẩm|skincare|son|kem|dưỡng da|serum', 'Mỹ phẩm', 0.18, 2],
      ['shopee', 'điện thoại|tai nghe|sạc|cáp sạc|ốp lưng|phụ kiện điện tử', 'Điện tử phụ kiện', 0.1, 3],
      ['shopee', 'gia dụng|bếp|nồi|chảo|máy xay', 'Gia dụng', 0.12, 4],
      ['shopee', 'thời trang|áo thun|quần jean|váy|giày sneaker|dép|túi xách', 'Thời trang', 0.15, 5],
      ['shopee', 'sách|văn phòng phẩm', 'Sách & VP', 0.08, 6],
      ['shopee', 'thực phẩm|bánh kẹo|sữa bột|đồ ăn', 'Thực phẩm', 0.06, 7],
      ['shopee', 'mẹ và bé|tã bỉm|sữa công thức', 'Mẹ & Bé', 0.1, 8],
      ['tiktok', 'default', 'TikTok mặc định', 0.1, 1],
      ['lazada', 'default', 'Lazada mặc định', 0.08, 1],
    ];
    for (const c of cards) ins.run(...c);
  }

  const blogCount = db.prepare('SELECT COUNT(*) as c FROM blog_posts').get().c;
  if (blogCount === 0) {
    const posts = [
      {
        slug: 'cach-nhan-hoan-tien-shopee',
        title: 'Cách nhận hoàn tiền Shopee chỉ trong 3 bước',
        excerpt: 'Hướng dẫn lấy link an_redir, mua hàng và khai báo mã đơn để nhận cashback.',
        content: `## Bước 1: Lấy link hoàn tiền\nDán link sản phẩm Shopee vào trang chủ → hệ thống tạo link affiliate (an_redir).\n\n## Bước 2: Mua hàng\nClick link trong 20–30 phút, không click link aff khác.\n\n## Bước 3: Khai báo đơn\nSau khi nhận hàng, vào **Khai báo đơn** nhập mã đơn Shopee. Admin đối soát → tiền hold 7 ngày → vào ví.`,
      },
      {
        slug: 'cashback-f1-f2-la-gi',
        title: 'Cashback 2 tầng F1/F2 là gì?',
        excerpt: 'Giới thiệu bạn bè để nhận thêm 5% F1 và 2% F2 trên tiền hoàn của họ.',
        content: `Khi bạn mời F1 đăng ký bằng mã giới thiệu, mỗi lần F1 được hoàn tiền bạn nhận **5%**. F2 (do F1 mời) mang lại **2%**.\n\nHoa hồng F1/F2 được cộng khi đơn ra khỏi hold và vào ví khả dụng.`,
      },
      {
        slug: 'luu-y-tranh-mat-hoan-tien',
        title: '5 lưu ý để không mất hoàn tiền',
        excerpt: 'Giỏ trống, không click link khác, tắt Adblock, thanh toán nhanh, không hủy đặt lại.',
        content: `1. Giỏ hàng chưa có sản phẩm đó trước khi click link.\n2. Không bấm link chia sẻ/aff khác trước checkout.\n3. Thanh toán trong 20–30 phút.\n4. Tắt Adblock.\n5. Hủy đơn phải lấy link mới và click lại.`,
      },
    ];
    const ins = db.prepare(
      `INSERT INTO blog_posts (slug, title, excerpt, content) VALUES (?, ?, ?, ?)`
    );
    for (const p of posts) ins.run(p.slug, p.title, p.excerpt, p.content);
  }
}

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value));
}

export function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
