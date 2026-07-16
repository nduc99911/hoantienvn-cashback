import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { initDb, db } from './db/schema.js';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

initDb();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: 'no_shopee_open_api',
    site: 'HoanTienVN Cashback',
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
      'zalo_bot',
      'telegram_bot',
    ],
    zaloBot: isZaloEnabled(),
    telegramBot: isTelegramBotEnabled(),
    setup: describeAffiliateSetup(),
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

app.get('/r/:code', (req, res) => {
  const link = db
    .prepare('SELECT * FROM cashback_links WHERE short_code = ?')
    .get(req.params.code);
  if (!link) return res.status(404).send('Link không tồn tại hoặc đã hết hạn');

  db.prepare('UPDATE cashback_links SET clicks = clicks + 1 WHERE id = ?').run(
    link.id
  );

  db.prepare(
    `INSERT INTO click_logs (link_id, user_id, short_code, platform, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    link.id,
    link.user_id,
    link.short_code,
    link.platform || 'shopee',
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket.remoteAddress ||
      null,
    (req.headers['user-agent'] || '').slice(0, 300)
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

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

// Cron: nhả hold mỗi 15 phút
cron.schedule('*/15 * * * *', () => {
  try {
    const r = releaseHeldOrders();
    if (r.released > 0) {
      console.log(`[hold] released ${r.released} orders, ${r.totalAmount}đ`);
    }
  } catch (e) {
    console.error('[hold] cron error', e.message);
  }
});

// release once on boot
setTimeout(() => {
  try {
    releaseHeldOrders();
  } catch {
    /* ignore */
  }
}, 3000);

app.listen(PORT, () => {
  const setup = describeAffiliateSetup();
  console.log(`\n🚀 HoanTienVN API: http://localhost:${PORT}`);
  console.log(`📦 Mode: an_redir | hold | fraud | telegram | zalo | multi-sàn`);
  console.log(
    `🔗 Affiliate ID: ${setup.affiliateId || 'CHƯA SET'} | redirect: ${setup.mode}`
  );
  console.log(
    `💬 Zalo bot: ${isZaloEnabled() ? 'BẬT' : 'TẮT'} | Telegram bot: ${
      isTelegramBotEnabled() ? 'BẬT' : 'TẮT (cần TELEGRAM_BOT_TOKEN)'
    }`
  );
  console.log(`⏰ Cron hold release: mỗi 15 phút\n`);

  // Telegram long polling (không cần HTTPS — phù hợp local)
  setTimeout(() => {
    try {
      startTelegramPolling();
    } catch (e) {
      console.error('[tg] start poll', e.message);
    }
  }, 1500);
});
