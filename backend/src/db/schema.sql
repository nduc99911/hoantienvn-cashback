-- Supabase / PostgreSQL schema for HoanTienVN
-- Chạy trong Supabase SQL Editor (Dashboard → SQL → New query)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by INTEGER REFERENCES users(id),
  balance DOUBLE PRECISION DEFAULT 0,
  pending_balance DOUBLE PRECISION DEFAULT 0,
  held_balance DOUBLE PRECISION DEFAULT 0,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cashback_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  platform TEXT DEFAULT 'shopee',
  original_url TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  product_name TEXT,
  product_image TEXT,
  product_price DOUBLE PRECISION,
  commission_rate DOUBLE PRECISION,
  cashback_rate DOUBLE PRECISION,
  estimated_cashback DOUBLE PRECISION,
  sub_id TEXT,
  shop_id TEXT,
  item_id TEXT,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS click_logs (
  id SERIAL PRIMARY KEY,
  link_id INTEGER REFERENCES cashback_links(id),
  user_id INTEGER REFERENCES users(id),
  short_code TEXT,
  platform TEXT DEFAULT 'shopee',
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  link_id INTEGER REFERENCES cashback_links(id),
  platform TEXT DEFAULT 'shopee',
  order_id TEXT,
  conversion_id TEXT,
  product_name TEXT,
  product_image TEXT,
  order_amount DOUBLE PRECISION DEFAULT 0,
  total_commission DOUBLE PRECISION DEFAULT 0,
  cashback_amount DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'claim',
  claim_note TEXT,
  admin_note TEXT,
  screenshot_url TEXT,
  fraud_score INTEGER DEFAULT 0,
  fraud_flags TEXT,
  hold_until TIMESTAMPTZ,
  purchase_time TIMESTAMPTZ,
  complete_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  balance_after DOUBLE PRECISION,
  status TEXT DEFAULT 'completed',
  reference_type TEXT,
  reference_id INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdraw_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount DOUBLE PRECISION NOT NULL,
  method TEXT NOT NULL,
  bank_name TEXT,
  bank_account TEXT,
  bank_holder TEXT,
  momo_phone TEXT,
  vietqr_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS rate_cards (
  id SERIAL PRIMARY KEY,
  platform TEXT DEFAULT 'shopee',
  keyword TEXT NOT NULL,
  label TEXT NOT NULL,
  commission_rate DOUBLE PRECISION NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  role_target TEXT,
  type TEXT,
  title TEXT,
  body TEXT,
  meta TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_url TEXT,
  published INTEGER DEFAULT 1,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  hits INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT DEFAULT 'register',
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status TEXT DEFAULT 'draft',
  audience TEXT DEFAULT 'opted_in',
  sent_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- cột mở rộng (Postgres)
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_in INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Tin tức';

CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  platform TEXT DEFAULT 'shopee',
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_label TEXT,
  min_order DOUBLE PRECISION DEFAULT 0,
  max_discount DOUBLE PRECISION DEFAULT 0,
  deep_link TEXT,
  expires_at TIMESTAMPTZ,
  used_percent INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
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
