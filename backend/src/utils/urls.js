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
 * Ưu tiên env production, bỏ qua localhost trong setting.
 */
export function getApiPublicUrl() {
  const candidates = [
    process.env.PUBLIC_URL,
    process.env.RENDER_EXTERNAL_URL,
    getSetting('public_url', ''),
    getSetting('api_public_url', ''),
  ];
  for (const c of candidates) {
    const u = stripSlash(c);
    if (u && !isLocalhost(u)) return u;
  }
  // Fallback production HoanTienVN
  return 'https://hoantienvn-api.onrender.com';
}

/**
 * Frontend (Vercel) — trang web, video, OAuth callback UI.
 */
export function getSiteUrl() {
  const candidates = [
    process.env.SITE_URL,
    getSetting('site_url', ''),
  ];
  for (const c of candidates) {
    const u = stripSlash(c);
    if (u && !isLocalhost(u)) return u;
  }
  const fromEnv = stripSlash(process.env.SITE_URL || process.env.PUBLIC_URL);
  if (fromEnv && !isLocalhost(fromEnv)) return fromEnv;
  return 'https://hoantienvn.vercel.app';
}

/** Short link hoàn tiền: https://api.../r/abc123 */
export function shortLinkUrl(shortCode) {
  return `${getApiPublicUrl()}/r/${shortCode}`;
}
