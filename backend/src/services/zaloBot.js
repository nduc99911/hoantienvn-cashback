/**
 * Xử lý lệnh bot Zalo — cashback Shopee
 */
import { customAlphabet } from 'nanoid';
import { db, getSetting } from '../db/schema.js';
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
import { sendZaloText } from './zalo.js';

const genBind = customAlphabet('0123456789', 6);
const genPass = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 10);

function formatVnd(n) {
  return `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;
}

function findUserByZalo(zaloId) {
  if (!zaloId) return null;
  return db.prepare('SELECT * FROM users WHERE zalo_id = ?').get(String(zaloId));
}

function menuText() {
  return (
    `📋 MENU HoanTienVN\n\n` +
    `🔗 Gửi link Shopee — lấy link hoàn tiền\n` +
    `💰 SODU — số dư ví\n` +
    `🏷 SUBID — mã tracking Shopee Aff\n` +
    `📦 DON — đơn gần đây\n` +
    `🔑 LIENKET <mã> — gắn TK web\n` +
    `📝 DANGKY — tạo TK nhanh trên Zalo\n` +
    `❓ HELP — trợ giúp\n\n` +
    `Mẹo: chỉ cần dán link shopee.vn là xong!`
  );
}

async function ensureZaloUser(zaloUserId, displayName) {
  let user = findUserByZalo(zaloUserId);
  if (user) return user;

  // auto-create light account
  const email = `zalo_${zaloUserId}@zalo.hoantien.local`;
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    db.prepare('UPDATE users SET zalo_id = ?, zalo_name = ? WHERE id = ?').run(
      String(zaloUserId),
      displayName || null,
      existing.id
    );
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  }

  let code = generateReferralCode();
  while (db.prepare('SELECT id FROM users WHERE referral_code = ?').get(code)) {
    code = generateReferralCode();
  }

  const name = displayName || `Zalo ${String(zaloUserId).slice(-6)}`;
  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, name, referral_code, zalo_id, zalo_name, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      email,
      hashPassword(genPass()),
      name,
      code,
      String(zaloUserId),
      displayName || null,
      null
    );

  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

async function cmdLink(user, url) {
  const result = await analyzeProduct(url);
  if (result.platform === 'shopee' && (!result.shopId || !result.itemId)) {
    return '❌ Không đọc được link Shopee. Hãy copy link đầy đủ từ app (có dạng -i.SHOP.ITEM).';
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
  while (db.prepare('SELECT id FROM cashback_links WHERE short_code = ?').get(shortCode)) {
    shortCode = generateShortCode();
  }

  db.prepare(
    `INSERT INTO cashback_links
     (user_id, platform, original_url, affiliate_url, short_code, product_name, product_image,
      product_price, commission_rate, cashback_rate, estimated_cashback, sub_id, shop_id, item_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
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
    result.itemId
  );

  const site = (getSetting('site_url', '') || 'http://localhost:5173').replace(/\/$/, '');
  // Prefer public site short link if production; also return an_redir direct
  const shortUrl = `${site}/r/${shortCode}`;
  // For API host redirect (works when site proxies /r)
  const apiPublic = process.env.PUBLIC_URL || site;

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
    `📦 ${result.productName}\n` +
    `${priceLine}\n` +
    `${cashLine}\n` +
    `🏷 sub_id: ${subId}\n\n` +
    `🔗 Mua ngay:\n${outbound}\n\n` +
    `📎 Short: ${apiPublic.replace(/\/$/, '')}/r/${shortCode}\n\n` +
    `⚠️ Click link trên → mua trong 20–30 phút. Không cần khai báo đơn.`
  );
}

function cmdBalance(user) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  return (
    `💰 VÍ CỦA BẠN\n\n` +
    `Khả dụng: ${formatVnd(u.balance)}\n` +
    `Đang hold: ${formatVnd(u.held_balance || 0)}\n` +
    `Chờ duyệt: ${formatVnd(u.pending_balance || 0)}\n\n` +
    `Mã GT: ${u.referral_code}\n` +
    `Sub ID: ${generateSubId(u)}`
  );
}

function cmdOrders(user) {
  const rows = db
    .prepare(
      `SELECT order_id, cashback_amount, status, source, created_at
       FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 5`
    )
    .all(user.id);
  if (!rows.length) {
    return '📦 Chưa có đơn. Mua qua link hoàn tiền, admin import báo cáo Aff là sẽ hiện.';
  }
  const lines = rows.map((o, i) => {
    return `${i + 1}. #${o.order_id || o.id} · ${formatVnd(o.cashback_amount)} · ${o.status}${o.source === 'import' ? ' (auto)' : ''}`;
  });
  return `📦 ĐƠN GẦN ĐÂY\n\n${lines.join('\n')}`;
}

function cmdBind(zaloUserId, code) {
  const bindCode = String(code || '').trim();
  if (!/^\d{6}$/.test(bindCode)) {
    return '❌ Mã liên kết gồm 6 số. Lấy mã trên web: Ví → Liên kết Zalo.';
  }
  const user = db
    .prepare('SELECT * FROM users WHERE zalo_bind_code = ?')
    .get(bindCode);
  if (!user) {
    return '❌ Mã không đúng hoặc đã hết hạn. Tạo mã mới trên website.';
  }

  // clear other bindings of this zalo
  db.prepare('UPDATE users SET zalo_id = NULL WHERE zalo_id = ?').run(String(zaloUserId));
  db.prepare(
    `UPDATE users SET zalo_id = ?, zalo_bind_code = NULL WHERE id = ?`
  ).run(String(zaloUserId), user.id);

  return (
    `✅ Đã liên kết Zalo với tài khoản\n` +
    `👤 ${user.name}\n` +
    `📧 ${user.email}\n` +
    `🏷 Sub ID: ${generateSubId(user)}\n\n` +
    `Giờ gửi link Shopee là lấy link hoàn tiền!`
  );
}

/**
 * Main handler — trả về text reply
 */
export async function handleZaloMessage({ zaloUserId, text, eventName }) {
  if (!zaloUserId) {
    return null;
  }

  // follow event
  if (/follow|oa_send_follow|user_follow/i.test(eventName || '')) {
    const welcome =
      getSetting('zalo_welcome', '') ||
      'Chào bạn! Gửi link Shopee để lấy link hoàn tiền. Gõ MENU để xem lệnh.';
    await ensureZaloUser(zaloUserId);
    return welcome + '\n\n' + menuText();
  }

  if (!text) {
    return 'Gửi link Shopee hoặc gõ MENU nhé!';
  }

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // commands without account
  if (/^(menu|help|huong dan|hướng dẫn|\?)$/i.test(lower)) {
    return menuText();
  }

  // LIENKET 123456
  const bindMatch = raw.match(/^(?:li[eê]n\s*k[eê]t|lienket|bind|linkacc)\s*[:=]?\s*(\d{6})$/i);
  if (bindMatch) {
    return cmdBind(zaloUserId, bindMatch[1]);
  }

  // DANGKY
  if (/^(dangky|đăng ký|register)$/i.test(lower)) {
    const user = await ensureZaloUser(zaloUserId);
    return (
      `✅ Tài khoản Zalo đã sẵn sàng!\n` +
      `👤 ${user.name}\n` +
      `🏷 Sub ID: ${generateSubId(user)}\n` +
      `Mã GT: ${user.referral_code}\n\n` +
      `Gửi link Shopee để lấy link hoàn tiền.\n` +
      `Muốn gắn TK web: vào web → tạo mã → gõ LIENKET <mã>`
    );
  }

  let user = findUserByZalo(zaloUserId);
  if (!user) {
    // auto create on first message with link or any command
    user = await ensureZaloUser(zaloUserId);
  }

  if (/^(sodu|số dư|so du|vi|ví|balance|wallet)$/i.test(lower)) {
    return cmdBalance(user);
  }

  if (/^(subid|sub_id|sub id|ma tracking|mã tracking)$/i.test(lower)) {
    return (
      `🏷 Sub ID Shopee Aff của bạn:\n\n` +
      `${generateSubId(user)}\n\n` +
      `Trên portal Aff: lọc cột Sub ID = mã này để thấy đơn của bạn.`
    );
  }

  if (/^(don|đơn|orders|donhang|đơn hàng)$/i.test(lower)) {
    return cmdOrders(user);
  }

  // detect Shopee / product URL in message
  const urlMatch = raw.match(
    /https?:\/\/[^\s]+|(?:shopee\.vn|s\.shopee\.vn|shope\.ee|shp\.ee|lazada\.vn|tiktok\.com)[^\s]*/i
  );
  if (urlMatch) {
    let url = urlMatch[0];
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
      return await cmdLink(user, url);
    } catch (e) {
      return `❌ ${e.message || 'Không tạo được link'}`;
    }
  }

  return (
    `Mình chưa hiểu 😅\n` +
    `→ Dán link Shopee để lấy link hoàn tiền\n` +
    `→ Hoặc gõ MENU`
  );
}

export async function processAndReply({ zaloUserId, text, eventName }) {
  const reply = await handleZaloMessage({ zaloUserId, text, eventName });
  if (reply && zaloUserId) {
    await sendZaloText(zaloUserId, reply);
  }
  return reply;
}

/** Tạo mã liên kết 6 số cho user web */
export function createBindCode(userId) {
  let code = genBind();
  // unique among active codes
  while (db.prepare('SELECT id FROM users WHERE zalo_bind_code = ?').get(code)) {
    code = genBind();
  }
  db.prepare('UPDATE users SET zalo_bind_code = ? WHERE id = ?').run(code, userId);
  return code;
}
