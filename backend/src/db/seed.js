import 'dotenv/config';
import { initDb, one, run } from './schema.js';
import { hashPassword, generateReferralCode } from '../utils/auth.js';

async function ensureUser({ email, password, name, role, referralCode, referredBy }) {
  const existing = await one('SELECT * FROM users WHERE email = ?', [email]);
  if (existing) return existing;
  const info = await run(
    `INSERT INTO users (email, password_hash, name, referral_code, referred_by, role, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      email,
      hashPassword(password),
      name,
      referralCode,
      referredBy || null,
      role || 'user',
      '0901234567',
    ]
  );
  return one('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid]);
}

async function main() {
  await initDb();

  const admin = await ensureUser({
    email: 'admin@hoantien.vn',
    password: 'admin123',
    name: 'Admin Hoàn Tiền',
    role: 'admin',
    referralCode: 'ADMIN001',
  });

  const demo = await ensureUser({
    email: 'demo@hoantien.vn',
    password: 'demo123',
    name: 'Nguyễn Demo',
    role: 'user',
    referralCode: 'DEMO2026',
    referredBy: admin.id,
  });

  await ensureUser({
    email: 'f1@hoantien.vn',
    password: 'demo123',
    name: 'Trần F1',
    role: 'user',
    referralCode: generateReferralCode(),
    referredBy: demo.id,
  });

  console.log('Seed xong!');
  console.log('Admin: admin@hoantien.vn / admin123');
  console.log('Demo:  demo@hoantien.vn / demo123');
  console.log('Mã giới thiệu demo:', demo.referral_code);
  console.log(
    'DB:',
    process.env.DATABASE_URL ? 'Supabase/Postgres' : 'SQLite local'
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
