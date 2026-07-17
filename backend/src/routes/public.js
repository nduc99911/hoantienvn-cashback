import { Router } from 'express';
import { getSetting, many, one } from '../db/schema.js';

const router = Router();

router.get('/config', (_req, res) => {
  res.json({
    siteName: getSetting('site_name', 'HoanTienVN'),
    holdDays: parseInt(getSetting('hold_days', '7'), 10),
    minWithdraw: parseFloat(getSetting('min_withdraw', '50000')),
    f1Rate: parseFloat(getSetting('f1_rate', '0.20')),
    f2Rate: parseFloat(getSetting('f2_rate', '0.10')),
    cashbackShare: parseFloat(getSetting('cashback_share_ratio', '0.70')),
    platforms: {
      shopee: getSetting('enable_shopee', '1') === '1',
      tiktok: getSetting('enable_tiktok', '1') === '1',
      lazada: getSetting('enable_lazada', '1') === '1',
    },
    support: {
      zalo:
        getSetting('support_zalo', '') ||
        process.env.SUPPORT_ZALO ||
        'https://zalo.me/g/wuoswofxgroqafas0oxe',
      zaloGroup:
        getSetting('support_zalo_group', '') ||
        process.env.SUPPORT_ZALO_GROUP ||
        getSetting('support_zalo', '') ||
        process.env.SUPPORT_ZALO ||
        'https://zalo.me/g/wuoswofxgroqafas0oxe',
      telegram:
        getSetting('support_telegram', '') ||
        process.env.SUPPORT_TELEGRAM ||
        'https://t.me/hoantienvn_shopee_bot',
      telegramBot:
        getSetting('support_telegram_bot', '') ||
        process.env.SUPPORT_TELEGRAM_BOT ||
        'hoantienvn_shopee_bot',
      phone: getSetting('support_phone', '') || process.env.SUPPORT_PHONE || '',
      email: getSetting('support_email', 'hotro@hoantien.vn'),
      facebook:
        getSetting('support_facebook', '') ||
        process.env.SUPPORT_FACEBOOK ||
        '',
      messenger:
        getSetting('support_messenger', '') ||
        process.env.SUPPORT_MESSENGER ||
        '',
      facebookPage:
        getSetting('support_facebook', '') ||
        process.env.SUPPORT_FACEBOOK ||
        '',
    },
    facebookBot: {
      enabled: getSetting('facebook_bot_enabled', '0') === '1',
    },
    guideVideoUrl:
      getSetting('guide_video_url', '') || process.env.GUIDE_VIDEO_URL || '',
    claimGuide: getSetting('claim_guide', ''),
    siteUrl: getSetting(
      'site_url',
      process.env.SITE_URL || 'https://hoantienvn.vercel.app'
    ),
    gscVerification:
      getSetting('gsc_verification', '') ||
      process.env.GSC_VERIFICATION ||
      '',
    googleAuthEnabled: Boolean(
      (process.env.GOOGLE_CLIENT_ID || getSetting('google_client_id', '')) &&
        process.env.GOOGLE_CLIENT_SECRET
    ),
    demoMode: getSetting('demo_mode_enabled', '0') === '1',
  });
});

/** Social proof stats */
router.get('/stats', async (_req, res) => {
  try {
    const clicks = Number(
      (await one('SELECT COUNT(*) as c FROM click_logs'))?.c || 0
    );
    const users = Number(
      (await one(
        `SELECT COUNT(*) as c FROM users WHERE status = 'active' OR status IS NULL`
      ))?.c || 0
    );
    const paid = Number(
      (
        await one(
          `SELECT COALESCE(SUM(cashback_amount),0) as s FROM orders WHERE status = 'paid'`
        )
      )?.s || 0
    );
    const held = Number(
      (
        await one(
          `SELECT COALESCE(SUM(cashback_amount),0) as s FROM orders WHERE status = 'held'`
        )
      )?.s || 0
    );
    res.json({
      clicks,
      members: users,
      paidCashback: paid,
      heldCashback: held,
      totalCashback: paid + held,
    });
  } catch (e) {
    res.json({
      clicks: 0,
      members: 0,
      paidCashback: 0,
      heldCashback: 0,
      totalCashback: 0,
    });
  }
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
