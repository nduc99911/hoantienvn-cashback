/**
 * URL helpers — short link /r/:code sống trên API (Render), không phải frontend Vite.
 */
import { getSetting } from '../db/schema.js';

function stripSlash(u) {
  return String(u || '').trim().replace(/\/$/, '');
}

function isLocalhost(u) {
  return /localhost|127\.0\.0\.1/i.test(String(u || ''));
}

/**
 * Base URL public của API (chứa /r/:shortCode).
 * Ưu tiên Admin public_url → env PUBLIC_URL → fallback domain chính.
 * (Không ưu tiên RENDER_EXTERNAL_URL vì luôn là *.onrender.com)
 */
export function getApiPublicUrl() {
  const candidates = [
    getSetting('public_url', ''),
    getSetting('api_public_url', ''),
    process.env.PUBLIC_URL,
    // custom domain chính thức
    'https://api.hoantien.pro.vn',
    process.env.RENDER_EXTERNAL_URL,
    'https://hoantienvn-api.onrender.com',
  ];
  for (const c of candidates) {
    const u = stripSlash(c);
    if (u && !isLocalhost(u)) return u;
  }
  return 'https://api.hoantien.pro.vn';
}

/**
 * Frontend (Vercel) — trang web, video, OAuth callback UI.
 */
export function getSiteUrl() {
  const candidates = [
    getSetting('site_url', ''),
    process.env.SITE_URL,
    'https://hoantien.pro.vn',
    'https://www.hoantien.pro.vn',
    'https://hoantienvn.vercel.app',
  ];
  for (const c of candidates) {
    const u = stripSlash(c);
    if (u && !isLocalhost(u)) return u;
  }
  return 'https://hoantien.pro.vn';
}

/** Short link hoàn tiền: https://api.../r/abc123 */
export function shortLinkUrl(shortCode) {
  return `${getApiPublicUrl()}/r/${shortCode}`;
}
