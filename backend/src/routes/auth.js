import { Router } from 'express';
import { db } from '../db/schema.js';
import {
  hashPassword,
  comparePassword,
  signToken,
  generateReferralCode,
} from '../utils/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { limitAuth } from '../middleware/rateLimit.js';
import { generateSubId } from '../services/affiliate.js';

const router = Router();

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    name: u.name,
    referralCode: u.referral_code,
    /** Mã Sub ID trên Shopee Aff — cố định, dùng đối soát */
    affSubId: generateSubId(u),
    balance: u.balance,
    pendingBalance: u.pending_balance,
    heldBalance: u.held_balance || 0,
    bankName: u.bank_name,
    bankAccount: u.bank_account,
    bankHolder: u.bank_holder,
    momoPhone: u.momo_phone,
    role: u.role,
    status: u.status || 'active',
    createdAt: u.created_at,
  };
}

router.post('/register', limitAuth, (req, res) => {
  try {
    const { email, password, name, phone, referralCode } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Vui lòng nhập email, mật khẩu và họ tên' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
    }

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    let referredBy = null;
    if (referralCode) {
      const ref = db
        .prepare('SELECT id FROM users WHERE referral_code = ?')
        .get(referralCode.toUpperCase());
      if (ref) referredBy = ref.id;
    }

    let code = generateReferralCode();
    while (db.prepare('SELECT id FROM users WHERE referral_code = ?').get(code)) {
      code = generateReferralCode();
    }

    const info = db
      .prepare(
        `INSERT INTO users (email, phone, password_hash, name, referral_code, referred_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        email.toLowerCase().trim(),
        phone || null,
        hashPassword(password),
        name.trim(),
        code,
        referredBy
      );

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Đăng ký thất bại' });
  }
});

router.post('/login', limitAuth, (req, res) => {
  // blocked users
  // checked after load
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    }
    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.toLowerCase().trim());
    if (!user || !comparePassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Đăng nhập thất bại' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put('/profile', requireAuth, (req, res) => {
  try {
    const { name, phone, bankName, bankAccount, bankHolder, momoPhone } = req.body;
    db.prepare(
      `UPDATE users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        bank_name = COALESCE(?, bank_name),
        bank_account = COALESCE(?, bank_account),
        bank_holder = COALESCE(?, bank_holder),
        momo_phone = COALESCE(?, momo_phone)
       WHERE id = ?`
    ).run(
      name || null,
      phone || null,
      bankName || null,
      bankAccount || null,
      bankHolder || null,
      momoPhone || null,
      req.user.id
    );
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Cập nhật thất bại' });
  }
});

export default router;
