import { Router } from 'express';
import { getSetting, many } from '../db/schema.js';

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
      email: getSetting('support_email', 'hotro@hoantien.vn'),
    },
    claimGuide: getSetting('claim_guide', ''),
    siteUrl: getSetting(
      'site_url',
      process.env.SITE_URL || 'https://hoantienvn.vercel.app'
    ),
    /** Google Search Console meta content (nếu set) */
    gscVerification:
      getSetting('gsc_verification', '') ||
      process.env.GSC_VERIFICATION ||
      '',
  });
});

router.get('/robots.txt', (_req, res) => {
  const base = (
    getSetting('site_url', process.env.SITE_URL || 'https://hoantienvn.vercel.app')
  ).replace(/\/$/, '');
  const apiBase = (
    process.env.PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    ''
  ).replace(/\/$/, '');
  const sitemapUrl = apiBase
    ? `${apiBase}/api/public/sitemap.xml`
    : `${base}/sitemap.xml`;
  res
    .type('text/plain')
    .send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /dashboard',
        'Disallow: /orders',
        'Disallow: /withdraw',
        'Disallow: /claim',
        'Disallow: /api/',
        '',
        `Sitemap: ${sitemapUrl}`,
        '',
      ].join('\n')
    );
});

router.get('/sitemap.xml', async (_req, res) => {
  const base = (
    getSetting('site_url', process.env.SITE_URL || 'https://hoantienvn.vercel.app')
  ).replace(/\/$/, '');

  const staticPaths = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/guide', priority: '0.8', changefreq: 'weekly' },
    { path: '/blog', priority: '0.8', changefreq: 'daily' },
    { path: '/terms', priority: '0.4', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.4', changefreq: 'monthly' },
    { path: '/cookies', priority: '0.3', changefreq: 'monthly' },
    { path: '/login', priority: '0.5', changefreq: 'monthly' },
    { path: '/register', priority: '0.6', changefreq: 'monthly' },
  ];

  let blogUrls = [];
  try {
    const posts = await many(
      `SELECT slug, updated_at, created_at FROM blog_posts
       WHERE published = 1 ORDER BY created_at DESC LIMIT 200`
    );
    blogUrls = posts.map((p) => ({
      path: `/blog/${p.slug}`,
      lastmod: (p.updated_at || p.created_at || '').toString().slice(0, 10),
      priority: '0.7',
      changefreq: 'weekly',
    }));
  } catch {
    /* ignore */
  }

  const all = [...staticPaths, ...blogUrls];
  const body = all
    .map((u) => {
      const last = u.lastmod
        ? `<lastmod>${u.lastmod}</lastmod>`
        : '';
      return `  <url>
    <loc>${base}${u.path === '/' ? '/' : u.path}</loc>
    ${last}
    <changefreq>${u.changefreq || 'weekly'}</changefreq>
    <priority>${u.priority || '0.5'}</priority>
  </url>`;
    })
    .join('\n');

  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`);
});

export default router;
