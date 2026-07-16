import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { initSentry, setupSentryExpress, captureException } from './sentry.js';
import { initDb, one, run, isPostgres } from './db/schema.js';
import authRoutes from './routes/auth.js';
import linkRoutes from './routes/links.js';
import walletRoutes from './routes/wallet.js';
import claimRoutes from './routes/claims.js';
import adminRoutes from './routes/admin.js';
import blogRoutes from './routes/blog.js';
import notifRoutes from './routes/notifications.js';
import publicRoutes from './routes/public.js';
import zaloRoutes from './routes/zalo.js';
import telegramRoutes from './routes/telegram.js';
import { describeAffiliateSetup } from './services/affiliate.js';
import { buildOutboundUrl } from './services/affiliate.js';
import { releaseHeldOrders } from './services/wallet.js';
import { isZaloEnabled } from './services/zalo.js';
import { isTelegramBotEnabled } from './services/telegram.js';
import { startTelegramPolling } from './services/telegramBot.js';

initSentry();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

await initDb();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: 'no_shopee_open_api',
    site: 'HoanTienVN Cashback',
    database: isPostgres ? 'supabase_postgres' : 'sqlite_local',
    features: [
      'an_redir',
      'claim',
      'hold',
      'fraud',
      'telegram',
      'vietqr',
      'import_csv',
      'blog',
      'multi_platform',
      'rate_limit',
      'telegram_bot',
      'supabase',
    ],
    zaloBot: isZaloEnabled(),
    telegramBot: isTelegramBotEnabled(),
    setup: describeAffiliateSetup(),
  });
});

/** Keep-alive nhẹ cho Render free (tránh sleep ~15 phút không traffic) */
app.get('/api/ping', (_req, res) => {
  res.status(200).json({
    ok: true,
    t: Date.now(),
    engine: isPostgres ? 'postgres' : 'sqlite',
  });
});

/**
 * Tick ngoài (GitHub Actions / UptimeRobot / cron-job.org)
 * - Luôn trả 200 để giữ instance warm
 * - Nếu header x-cron-secret đúng → chạy release hold
 */
app.all('/api/cron/tick', async (req, res) => {
  const secret = process.env.CRON_SECRET || '';
  const got =
    req.get('x-cron-secret') ||
    req.query.secret ||
    req.body?.secret ||
    '';
  let hold = null;
  if (secret && got && secret === got) {
    try {
      hold = await releaseHeldOrders();
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
  res.json({
    ok: true,
    t: Date.now(),
    hold: hold
      ? { released: hold.released, totalAmount: hold.totalAmount }
      : null,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/zalo', zaloRoutes);
app.use('/api/telegram', telegramRoutes);

app.get('/r/:code', async (req, res) => {
  try {
    const link = await one(
      'SELECT * FROM cashback_links WHERE short_code = ?',
      [req.params.code]
    );
    if (!link) return res.status(404).send('Link không tồn tại hoặc đã hết hạn');

    await run('UPDATE cashback_links SET clicks = clicks + 1 WHERE id = ?', [
      link.id,
    ]);

    await run(
      `INSERT INTO click_logs (link_id, user_id, short_code, platform, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        link.id,
        link.user_id,
        link.short_code,
        link.platform || 'shopee',
        req.headers['x-forwarded-for']?.toString().split(',')[0] ||
          req.socket.remoteAddress ||
          null,
        (req.headers['user-agent'] || '').slice(0, 300),
      ]
    );

    let target = link.affiliate_url;
    try {
      if ((link.platform || 'shopee') === 'shopee') {
        target =
          buildOutboundUrl({
            productLink: link.original_url,
            originalUrl: link.original_url,
            shopId: link.shop_id,
            itemId: link.item_id,
            subId: link.sub_id,
          }) || link.affiliate_url;
      }
    } catch {
      target = link.affiliate_url;
    }

    res.redirect(302, target);
  } catch (e) {
    console.error(e);
    res.status(500).send('Lỗi redirect');
  }
});

const dist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(dist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) {
      res
        .status(404)
        .json({ error: 'Frontend chưa build. Chạy npm run dev ở frontend.' });
    }
  });
});

setupSentryExpress(app);

app.use((err, _req, res, _next) => {
  console.error(err);
  captureException(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

cron.schedule('*/15 * * * *', () => {
  releaseHeldOrders()
    .then((r) => {
      if (r.released > 0) {
        console.log(`[hold] released ${r.released} orders, ${r.totalAmount}đ`);
      }
    })
    .catch((e) => console.error('[hold] cron error', e.message));
});

setTimeout(() => {
  releaseHeldOrders().catch(() => {});
}, 3000);

app.listen(PORT, '0.0.0.0', () => {
  const setup = describeAffiliateSetup();
  console.log(`\n🚀 HoanTienVN API: http://localhost:${PORT}`);
  console.log(
    `🗄  Database: ${isPostgres ? 'Supabase Postgres' : 'SQLite local'}`
  );
  console.log(
    `🔗 Affiliate ID: ${setup.affiliateId || 'CHƯA SET'} | redirect: ${setup.mode}`
  );
  console.log(
    `💬 Telegram bot: ${
      isTelegramBotEnabled() ? 'BẬT' : 'TẮT'
    } | Zalo: ${isZaloEnabled() ? 'BẬT' : 'TẮT'}`
  );
  console.log(`⏰ Cron hold: mỗi 15 phút\n`);

  setTimeout(() => {
    try {
      startTelegramPolling();
    } catch (e) {
      console.error('[tg] start poll', e.message);
    }
  }, 1500);
});
