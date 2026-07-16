import { Router } from 'express';
import { getSetting, getAllSettings } from '../db/schema.js';

const router = Router();

router.get('/config', (_req, res) => {
  res.json({
    siteName: getSetting('site_name', 'HoanTienVN'),
    holdDays: parseInt(getSetting('hold_days', '7'), 10),
    minWithdraw: parseFloat(getSetting('min_withdraw', '50000')),
    f1Rate: parseFloat(getSetting('f1_rate', '0.05')),
    f2Rate: parseFloat(getSetting('f2_rate', '0.02')),
    cashbackShare: parseFloat(getSetting('cashback_share_ratio', '0.70')),
    platforms: {
      shopee: getSetting('enable_shopee', '1') === '1',
      tiktok: getSetting('enable_tiktok', '1') === '1',
      lazada: getSetting('enable_lazada', '1') === '1',
    },
    support: {
      zalo: getSetting('support_zalo', ''),
      phone: getSetting('support_phone', ''),
      email: getSetting('support_email', ''),
    },
    claimGuide: getSetting('claim_guide', ''),
  });
});

router.get('/sitemap.xml', (_req, res) => {
  const base = getSetting('site_url', 'http://localhost:5173').replace(/\/$/, '');
  const urls = ['', '/blog', '/login', '/register', '/terms', '/guide'].map(
    (p) => `
  <url><loc>${base}${p || '/'}</loc><changefreq>weekly</changefreq></url>`
  );
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}
</urlset>`);
});

export default router;
