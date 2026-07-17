/**
 * Google OAuth 2.0
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *       SITE_URL (frontend callback: /auth/google/callback?token=)
 */
import { Router } from 'express';
import crypto from 'crypto';
import { one, run } from '../db/schema.js';
import {
  hashPassword,
  signToken,
  generateReferralCode,
} from '../utils/auth.js';
import { getSetting } from '../db/schema.js';

const router = Router();

function clientId() {
  return (
    process.env.GOOGLE_CLIENT_ID ||
    getSetting('google_client_id', '') ||
    ''
  ).trim();
}
function clientSecret() {
  return (process.env.GOOGLE_CLIENT_SECRET || '').trim();
}
function redirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'https://api.hoantien.pro.vn'}/api/auth/google/callback`
  ).replace(/\/$/, '');
}
function frontendBase() {
  return (
    process.env.SITE_URL ||
    getSetting('site_url', 'http://localhost:5173')
  ).replace(/\/$/, '');
}

router.get('/status', (_req, res) => {
  res.json({
    enabled: Boolean(clientId() && clientSecret()),
    clientId: clientId() ? clientId().slice(0, 12) + '…' : '',
  });
});

router.get('/start', (req, res) => {
  const id = clientId();
  if (!id || !clientSecret()) {
    return res.status(503).json({
      error:
        'Google OAuth chưa cấu hình. Cần GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET trên server.',
    });
  }
  const state = crypto.randomBytes(16).toString('hex');
  // state cookie-less: embed in state with HMAC optional; simple redirect
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state: state + (req.query.ref ? `|${String(req.query.ref).slice(0, 20)}` : ''),
  });
  res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
});

router.get('/callback', async (req, res) => {
  const fail = (msg) => {
    res.redirect(
      `${frontendBase()}/login?error=${encodeURIComponent(msg || 'Google login failed')}`
    );
  };
  try {
    const { code, state } = req.query;
    if (!code) return fail('Thiếu code Google');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId(),
        client_secret: clientSecret(),
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return fail(tokens.error_description || 'Không lấy được token Google');
    }

    const profileRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const profile = await profileRes.json();
    if (!profile.email) return fail('Google không trả email');

    const email = String(profile.email).toLowerCase();
    let user =
      (await one('SELECT * FROM users WHERE google_id = ?', [profile.id])) ||
      (await one('SELECT * FROM users WHERE email = ?', [email]));

    if (!user) {
      let referredBy = null;
      const refPart = String(state || '').split('|')[1];
      if (refPart) {
        const ref = await one(
          'SELECT id FROM users WHERE referral_code = ?',
          [refPart.toUpperCase()]
        );
        if (ref) referredBy = ref.id;
      }
      let codeRef = generateReferralCode();
      while (await one('SELECT id FROM users WHERE referral_code = ?', [codeRef])) {
        codeRef = generateReferralCode();
      }
      const randomPass = hashPassword(crypto.randomBytes(24).toString('hex'));
      const info = await run(
        `INSERT INTO users
         (email, password_hash, name, referral_code, referred_by, google_id, phone, marketing_opt_in)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          email,
          randomPass,
          profile.name || email.split('@')[0],
          codeRef,
          referredBy,
          profile.id,
          null,
        ]
      );
      user = await one('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid]);
    } else {
      if (!user.google_id && profile.id) {
        await run('UPDATE users SET google_id = ? WHERE id = ?', [
          profile.id,
          user.id,
        ]);
      }
      if (user.status === 'banned') return fail('Tài khoản đã bị khóa');
    }

    const jwt = signToken(user);
    res.redirect(`${frontendBase()}/auth/callback?token=${encodeURIComponent(jwt)}`);
  } catch (e) {
    console.error('[google]', e);
    fail(e.message);
  }
});

export default router;
