/**
 * Bot Telegram user — lệnh cashback Shopee
 */
import { customAlphabet } from 'nanoid';
import { one, many, run, getSetting } from '../db/schema.js';
import {
  hashPassword,
  generateReferralCode,
  generateShortCode,
} from '../utils/auth.js';
import {
  generateSubId,
  buildOutboundUrl,
  toCanonicalProductLink,
} from './affiliate.js';
import { analyzeProduct } from './product.js';
import { sendTelegramTo, getTelegramToken } from './telegram.js';
import { getSiteUrl } from '../utils/urls.js';

const genBind = customAlphabet('0123456789', 6);
const genPass = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 10);

let pollOffset = 0;
let polling = false;

function formatVnd(n) {
  return `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function findByTelegram(chatId) {
  if (!chatId) return null;
  return one('SELECT * FROM users WHERE telegram_id = ?', [String(chatId)]);
}

function menuText() {
  const site = getSiteUrl();
  return (
    `📋 <b>MENU HoanTienVN</b>\n\n` +
    `🌐 <b>Website:</b> ${site}\n` +
    `   Ví · rút tiền · lấy link · mời bạn\n\n` +
    `🔗 Gửi <b>link Shopee</b> — lấy link hoàn tiền\n` +
    `💰 /sodu — số dư ví\n` +
    `🏷 /subid — mã tracking Aff\n` +
    `📦 /don — đơn gần đây\n` +
    `🔑 /lienket 123456 — gắn TK web (mã 6 số từ Dashboard)\n` +
    `📝 /dangky — tạo TK nhanh (chỉ bot, login web cần liên kết)\n` +
    `❓ /menu — menu này\n\n` +
    `<b>Liên kết web:</b>\n` +
    `1) Mở ${site} → đăng ký/login\n` +
    `2) Dashboard → Tạo mã Telegram\n` +
    `3) Gửi: /lienket xxxxxx\n` +
    `→ Cùng ví / sub_id với website\n\n` +
    `Mẹo: chỉ cần dán link shopee.vn!`
  );
}

async function ensureTgUser(chatId, from) {
  let user = await findByTelegram(chatId);
  if (user) return user;

  const email = `tg_${chatId}@telegram.hoantien.local`;
  const existing = await one('SELECT * FROM users WHERE email = ?', [email]);
  const displayName =
    [from?.first_name, from?.last_name].filter(Boolean).join(' ') ||
    from?.username ||
    `TG ${String(chatId).slice(-6)}`;

  if (existing) {
    await run(
      'UPDATE users SET telegram_id = ?, telegram_name = ? WHERE id = ?',
      [String(chatId), displayName, existing.id]
    );
    return one('SELECT * FROM users WHERE id = ?', [existing.id]);
  }

  let code = generateReferralCode();
  while (await one('SELECT id FROM users WHERE referral_code = ?', [code])) {
    code = generateReferralCode();
  }

  const info = await run(
    `INSERT INTO users (email, password_hash, name, referral_code, telegram_id, telegram_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      email,
      hashPassword(genPass()),
      displayName,
      code,
      String(chatId),
      displayName,
    ]
  );

  return one('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid]);
}

async function cmdLink(user, url) {
  const result = await analyzeProduct(url);
  if (result.platform === 'shopee' && (!result.shopId || !result.itemId)) {
    return '❌ Không đọc được link Shopee. Copy link đầy đủ (có -i.SHOP.ITEM).';
  }

  const subId = generateSubId(user);
  const originLink = toCanonicalProductLink(
    result.productLink,
    result.originalUrl,
    result.shopId,
    result.itemId
  );

  let outbound;
  if (result.platform === 'shopee') {
    outbound = buildOutboundUrl({
      productLink: result.productLink,
      originalUrl: result.originalUrl,
      shopId: result.shopId,
      itemId: result.itemId,
      subId,
    });
  } else {
    outbound = result.productLink || result.originalUrl;
  }

  let shortCode = generateShortCode();
  while (await one('SELECT id FROM cashback_links WHERE short_code = ?', [shortCode])) {
    shortCode = generateShortCode();
  }

  await run(
    `INSERT INTO cashback_links
     (user_id, platform, original_url, affiliate_url, short_code, product_name, product_image,
      product_price, commission_rate, cashback_rate, estimated_cashback, sub_id, shop_id, item_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      result.platform || 'shopee',
      originLink || result.productLink,
      outbound,
      shortCode,
      result.productName,
      result.productImage,
      result.productPrice,
      result.commissionRate,
      result.cashbackRate,
      result.estimatedCashback,
      subId,
      result.shopId,
      result.itemId,
    ]
  );

  const { shortLinkUrl } = await import('../utils/urls.js');
  const short = shortLinkUrl(shortCode);

  const priceLine =
    result.productPrice != null
      ? `💰 Giá: ${formatVnd(result.productPrice)}`
      : '💰 Giá: đang cập nhật';
  const cashLine =
    result.estimatedCashback != null
      ? `🎁 Hoàn dự kiến: ~${formatVnd(result.estimatedCashback)}`
      : '🎁 Hoàn: theo hoa hồng Aff';

  return (
    `✅ <b>Link hoàn tiền</b>\n\n` +
    `📦 ${escapeHtml(result.productName)}\n` +
    `${priceLine}\n` +
    `${cashLine}\n` +
    `🏷 sub_id: <code>${subId}</code>\n\n` +
    `🔗 <b>Mua ngay:</b>\n${outbound}\n\n` +
    `📎 Short: ${short}\n\n` +
    `⚠️ Click link → mua trong 20–30 phút. Không cần khai báo đơn.`
  );
}

async function cmdBalance(user) {
  const u = await one('SELECT * FROM users WHERE id = ?', [user.id]);
  return (
    `💰 <b>VÍ CỦA BẠN</b>\n\n` +
    `Khả dụng: <b>${formatVnd(u.balance)}</b>\n` +
    `Đang hold: ${formatVnd(u.held_balance || 0)}\n` +
    `Chờ duyệt: ${formatVnd(u.pending_balance || 0)}\n\n` +
    `Mã GT: <code>${u.referral_code}</code>\n` +
    `Sub ID: <code>${generateSubId(u)}</code>`
  );
}

async function cmdOrders(user) {
  const rows = await many(
    `SELECT order_id, cashback_amount, status, source
     FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 5`,
    [user.id]
  );
  if (!rows.length) {
    return '📦 Chưa có đơn. Mua qua link hoàn tiền → admin import báo cáo Aff.';
  }
  return (
    `📦 <b>ĐƠN GẦN ĐÂY</b>\n\n` +
    rows
      .map(
        (o, i) =>
          `${i + 1}. #${o.order_id || '—'} · ${formatVnd(o.cashback_amount)} · ${o.status}${
            o.source === 'import' ? ' (auto)' : ''
          }`
      )
      .join('\n')
  );
}

async function cmdBind(chatId, code) {
  const bindCode = String(code || '').trim();
  if (!/^\d{6}$/.test(bindCode)) {
    return '❌ Mã 6 số. Trên web: Ví → Tạo mã Telegram → gõ /lienket 123456';
  }
  const user = await one(
    'SELECT * FROM users WHERE telegram_bind_code = ?',
    [bindCode]
  );
  if (!user) return '❌ Mã sai hoặc đã dùng. Tạo mã mới trên website.';

  await run('UPDATE users SET telegram_id = NULL WHERE telegram_id = ?', [
    String(chatId),
  ]);
  await run(
    `UPDATE users SET telegram_id = ?, telegram_bind_code = NULL WHERE id = ?`,
    [String(chatId), user.id]
  );

  return (
    `✅ Đã liên kết Telegram\n` +
    `👤 ${escapeHtml(user.name)}\n` +
    `📧 ${escapeHtml(user.email)}\n` +
    `🏷 Sub ID: <code>${generateSubId(user)}</code>\n\n` +
    `Gửi link Shopee để lấy link hoàn tiền!`
  );
}

export async function handleTelegramUpdate(update) {
  const msg = update.message || update.edited_message;
  if (!msg?.chat?.id) return null;

  const chatId = msg.chat.id;
  const text = (msg.text || msg.caption || '').trim();
  const from = msg.from;

  if (!text) {
    await reply(chatId, 'Gửi link Shopee hoặc /menu nhé!', false);
    return;
  }

  const cmd = text.replace(/@\w+/g, '').trim();
  const lower = cmd.toLowerCase();

  if (/^\/(start|menu|help)$/i.test(lower) || /^(menu|help)$/i.test(lower)) {
    await ensureTgUser(chatId, from);
    const site = getSiteUrl();
    const welcome =
      getSetting('telegram_welcome', '') ||
      `Chào bạn! Bot HoanTienVN — hoàn tiền Shopee.\n🌐 Web: ${site}`;
    await reply(chatId, welcome + '\n\n' + menuText(), true);
    return;
  }

  const bindM = cmd.match(
    /^\/?(?:lienket|li[eê]n\s*k[eê]t|bind)\s*[:=]?\s*(\d{6})$/i
  );
  if (bindM) {
    await reply(chatId, await cmdBind(chatId, bindM[1]), true);
    return;
  }

  if (/^\/?(dangky|đăng ký|register)$/i.test(lower)) {
    const user = await ensureTgUser(chatId, from);
    await reply(
      chatId,
      `✅ Tài khoản Telegram sẵn sàng!\n👤 ${escapeHtml(user.name)}\n🏷 Sub ID: <code>${generateSubId(user)}</code>\nMã GT: <code>${user.referral_code}</code>\n\nGửi link Shopee đi!`,
      true
    );
    return;
  }

  let user = await findByTelegram(chatId);
  if (!user) user = await ensureTgUser(chatId, from);

  if (/^\/?(sodu|số dư|so du|vi|ví|balance|wallet)$/i.test(lower)) {
    await reply(chatId, await cmdBalance(user), true);
    return;
  }

  if (/^\/?(subid|sub_id|sub)$/i.test(lower)) {
    await reply(
      chatId,
      `🏷 Sub ID Shopee Aff:\n<code>${generateSubId(user)}</code>\n\nLọc cột Sub ID trên portal Aff = mã này.`,
      true
    );
    return;
  }

  if (/^\/?(don|đơn|orders)$/i.test(lower)) {
    await reply(chatId, await cmdOrders(user), true);
    return;
  }

  const urlMatch = cmd.match(
    /https?:\/\/[^\s]+|(?:shopee\.vn|s\.shopee\.vn|shope\.ee|shp\.ee|lazada\.vn|tiktok\.com)[^\s]*/i
  );
  if (urlMatch) {
    let url = urlMatch[0];
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
      const out = await cmdLink(user, url);
      await reply(chatId, out, true);
    } catch (e) {
      await reply(chatId, `❌ ${e.message || 'Lỗi tạo link'}`, false);
    }
    return;
  }

  await reply(chatId, `Chưa hiểu 😅\n→ Dán link Shopee\n→ Hoặc /menu`, false);
}

async function reply(chatId, text, html) {
  return sendTelegramTo(chatId, text, html ? { parse_mode: 'HTML' } : {});
}

export async function processTelegramWebhook(body) {
  if (!body) return;
  try {
    await handleTelegramUpdate(body);
  } catch (e) {
    console.error('[tg bot]', e);
  }
}

export function startTelegramPolling() {
  if (polling) return;
  if (!getTelegramToken()) {
    console.log('[tg] polling skip — chưa có token');
    return;
  }
  const mode = getSetting('telegram_mode', process.env.TELEGRAM_MODE || 'polling');
  if (mode === 'webhook') {
    console.log('[tg] mode=webhook — không poll');
    return;
  }

  polling = true;
  console.log('[tg] long polling started');

  (async function loop() {
    while (polling) {
      try {
        const { getUpdates } = await import('./telegram.js');
        const updates = await getUpdates(pollOffset);
        for (const u of updates) {
          pollOffset = u.update_id + 1;
          await handleTelegramUpdate(u);
        }
      } catch (e) {
        console.error('[tg] poll error', e.message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  })();
}

export function stopTelegramPolling() {
  polling = false;
}

export async function createTelegramBindCode(userId) {
  let code = genBind();
  while (await one('SELECT id FROM users WHERE telegram_bind_code = ?', [code])) {
    code = genBind();
  }
  await run('UPDATE users SET telegram_bind_code = ? WHERE id = ?', [
    code,
    userId,
  ]);
  return code;
}
