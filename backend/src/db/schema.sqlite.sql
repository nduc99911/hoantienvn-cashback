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
  zalo_id TEXT,
  zalo_bind_code TEXT,
  zalo_name TEXT,
  telegram_id TEXT,
  telegram_bind_code TEXT,
  telegram_name TEXT,
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
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);

CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT DEFAULT 'register',
  attempts INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status TEXT DEFAULT 'draft',
  audience TEXT DEFAULT 'opted_in',
  sent_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  sent_at TEXT
);
CREATE TABLE IF NOT EXISTS vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT DEFAULT 'shopee',
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_label TEXT,
  min_order REAL DEFAULT 0,
  max_discount REAL DEFAULT 0,
  deep_link TEXT,
  expires_at TEXT,
  used_percent INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
