import 'dotenv/config';
import { initDb, db } from './schema.js';
import { hashPassword, generateReferralCode } from '../utils/auth.js';

initDb();

const adminEmail = 'admin@hoantien.vn';
const userEmail = 'demo@hoantien.vn';

function ensureUser({ email, password, name, role, referralCode, referredBy }) {
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) return existing;
  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, name, referral_code, referred_by, role, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      email,
      hashPassword(password),
      name,
      referralCode,
      referredBy || null,
      role || 'user',
      '0901234567'
    );
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

const admin = ensureUser({
  email: adminEmail,
  password: 'admin123',
  name: 'Admin Hoàn Tiền',
  role: 'admin',
  referralCode: 'ADMIN001',
});

const demo = ensureUser({
  email: userEmail,
  password: 'demo123',
  name: 'Nguyễn Demo',
  role: 'user',
  referralCode: 'DEMO2026',
  referredBy: admin.id,
});

// F1 under demo
ensureUser({
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
