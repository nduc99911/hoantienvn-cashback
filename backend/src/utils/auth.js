import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const genCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);
const genShort = customAlphabet('abcdefghijkmnopqrstuvwxyz23456789', 8);

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function generateReferralCode() {
  return genCode();
}

export function generateShortCode() {
  return genShort();
}
