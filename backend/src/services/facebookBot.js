/**
 * Facebook Messenger bot — cashback commands (mirror Telegram/Zalo)
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
import { sendFacebookText, isFacebookBotEnabled } from './facebook.js';
import { shortLinkUrl, getSiteUrl } from '../utils/urls.js';

const genBind = customAlphabet('0123456789', 6);
const genPass = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 10);

function formatVnd(n) {
  return `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;
}

function menuText() {
  const site = getSiteUrl();
  return (
    `📋 MENU HoanTienVN (Messenger)\n\n` +
    `🌐 Website: ${site}\n` +
    `   Ví · rút tiền · lấy link · mời bạn\n\n` +
    `🔗 Gửi link Shopee — lấy link hoàn tiền\n` +
    `💰 sodu — số dư ví\n` +
    `🏷 subid — mã tracking\n` +
    `📦 don — đơn gần đây\n` +
    `🔑 lienket 123456 — gắn TK web (mã 6 số Dashboard)\n` +
    `📝 dangky — tạo TK nhanh\n` +
    `❓ menu — menu này\n\n` +
    `Liên kết web:\n` +
    `1) Mở ${site} → đăng ký/login\n` +
    `2) Dashboard → Tạo mã Facebook\n` +
    `3) Gửi: lienket xxxxxx\n` +
    `→ Cùng ví với website`
  );
}

async function findByFb(psid) {
  if (!psid) return null;
  return one('SELECT * FROM users WHERE facebook_psid = ?', [String(psid)]);
}

async function ensureFbUser(psid, displayName) {
  let user = await findByFb(psid);
  if (user) return user;

  const email = `fb_${psid}@facebook.hoantien.local`;
  const existing = await one('SELECT * FROM users WHERE email = ?', [email]);
  const name =
    (displayName && String(displayName).trim()) ||
    `FB ${String(psid).slice(-6)}`;

  if (existing) {
    await run(
      'UPDATE users SET facebook_psid = ?, facebook_name = ? WHERE id = ?',
      [String(psid), name, existing.id]
    );
    return one('SELECT * FROM users WHERE id = ?', [existing.id]);
  }

  let code = generateReferralCode();
  while (await one('SELECT id FROM users WHERE referral_code = ?', [code])) {
    code = generateReferralCode();
  }

  const info = await run(
    `INSERT INTO users (email, password_hash, name, referral_code, facebook_psid, facebook_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [email, hashPassword(genPass()), name, code, String(psid), name]
  );

  return one('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid]);
}

async function cmdLink(user, url) {
  const result = await analyzeProduct(url);
  if (result.platform === 'shopee' && (!result.shopId || !result.itemId)) {
    return '❌ Không đọc được link Shopee. Copy link đầy đủ.';
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
    `✅ Link hoàn tiền\n\n` +
    `📦 ${result.productName || 'Sản phẩm'}\n` +
    `${priceLine}\n` +
    `${cashLine}\n` +
    `🏷 sub_id: ${subId}\n\n` +
    `🔗 Mua ngay (short link):\n${short}\n\n` +
    `⚠️ Bấm short link mới ghi click. Mua trong 20–30 phút.`
  );
}

async function cmdBalance(user) {
  const u = await one('SELECT * FROM users WHERE id = ?', [user.id]);
  return (
    `💰 VÍ CỦA BẠN\n\n` +
    `Khả dụng: ${formatVnd(u.balance)}\n` +
    `Đang hold: ${formatVnd(u.held_balance || 0)}\n` +
    `Chờ duyệt: ${formatVnd(u.pending_balance || 0)}\n\n` +
    `Mã GT: ${u.referral_code}\n` +
    `Sub ID: ${generateSubId(u)}`
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
    `📦 ĐƠN GẦN ĐÂY\n\n` +
    rows
      .map(
        (o, i) =>
          `${i + 1}. #${o.order_id || '—'} · ${formatVnd(o.cashback_amount)} · ${o.status}`
      )
      .join('\n')
  );
}

async function cmdBind(psid, code) {
  const bindCode = String(code || '').trim();
  if (!/^\d{6}$/.test(bindCode)) {
    return '❌ Mã 6 số. Web → Dashboard → Tạo mã Facebook → gửi: lienket 123456';
  }
  const user = await one(
    'SELECT * FROM users WHERE facebook_bind_code = ?',
    [bindCode]
  );
  if (!user) return '❌ Mã sai hoặc đã dùng. Tạo mã mới trên website.';

  await run('UPDATE users SET facebook_psid = NULL WHERE facebook_psid = ?', [
    String(psid),
  ]);
  await run(
    `UPDATE users SET facebook_psid = ?, facebook_bind_code = NULL WHERE id = ?`,
    [String(psid), user.id]
  );

  return (
    `✅ Đã liên kết Facebook Messenger\n` +
    `👤 ${user.name}\n` +
    `📧 ${user.email}\n` +
    `🏷 Sub ID: ${generateSubId(user)}\n\n` +
    `Gửi link Shopee để lấy link hoàn tiền!`
  );
}

export async function handleFacebookMessage({ psid, text, name }) {
  if (!psid) return null;
  const raw = (text || '').trim();
  if (!raw) {
    return 'Gửi link Shopee hoặc gõ menu nhé!';
  }

  const cmd = raw.replace(/@\w+/g, '').trim();
  const lower = cmd.toLowerCase();

  if (
    /^(menu|help|start|\/start|\/menu|\/help|xin chào|hi|hello)$/i.test(lower)
  ) {
    await ensureFbUser(psid, name);
    const welcome =
      getSetting('facebook_welcome', '') ||
      'Chào bạn! HoanTienVN trên Messenger — dán link Shopee để lấy link hoàn tiền.';
    return welcome + '\n\n' + menuText();
  }

  const bindM = cmd.match(
    /^(?:\/)?(?:lienket|li[eê]n\s*k[eê]t|bind)\s*[:=]?\s*(\d{6})$/i
  );
  if (bindM) return cmdBind(psid, bindM[1]);

  if (/^(?:\/)?(?:dangky|đăng\s*ký|register)$/i.test(lower)) {
    const user = await ensureFbUser(psid, name);
    return (
      `✅ Tài khoản Messenger sẵn sàng!\n` +
      `👤 ${user.name}\n` +
      `🏷 Sub ID: ${generateSubId(user)}\n` +
      `Mã GT: ${user.referral_code}\n\n` +
      `Gửi link Shopee đi!`
    );
  }

  let user = await findByFb(psid);
  if (!user) user = await ensureFbUser(psid, name);

  if (/^(?:\/)?(?:sodu|số\s*dư|so\s*du|balance|wallet)$/i.test(lower)) {
    return cmdBalance(user);
  }
  if (/^(?:\/)?(?:subid|sub_id|sub)$/i.test(lower)) {
    return `🏷 Sub ID:\n${generateSubId(user)}`;
  }
  if (/^(?:\/)?(?:don|đơn|orders)$/i.test(lower)) {
    return cmdOrders(user);
  }

  const urlMatch = cmd.match(
    /https?:\/\/[^\s]+|(?:shopee\.vn|s\.shopee\.vn|shope\.ee|shp\.ee|lazada\.vn|tiktok\.com)[^\s]*/i
  );
  if (urlMatch) {
    let url = urlMatch[0];
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
      return await cmdLink(user, url);
    } catch (e) {
      return `❌ ${e.message || 'Lỗi tạo link'}`;
    }
  }

  return `Chưa hiểu 😅\n→ Dán link Shopee\n→ Hoặc gõ menu`;
}

export async function processFacebookMessagingEvent(event) {
  if (!isFacebookBotEnabled()) return;
  const psid = event?.sender?.id;
  if (!psid) return;

  // message text
  const text =
    event.message?.text ||
    event.message?.quick_reply?.payload ||
    event.postback?.payload ||
    event.postback?.title ||
    '';

  // ignore echoes / delivery
  if (event.message?.is_echo) return;

  try {
    const reply = await handleFacebookMessage({
      psid,
      text,
      name: null,
    });
    if (reply) await sendFacebookText(psid, reply);
  } catch (e) {
    console.error('[fb bot]', e.message);
  }
}

export async function createFacebookBindCode(userId) {
  let code = genBind();
  while (await one('SELECT id FROM users WHERE facebook_bind_code = ?', [code])) {
    code = genBind();
  }
  await run('UPDATE users SET facebook_bind_code = ? WHERE id = ?', [
    code,
    userId,
  ]);
  return code;
}
