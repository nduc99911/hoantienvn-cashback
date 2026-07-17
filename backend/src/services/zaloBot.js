/**
 * Zalo cashback bot logic (plain text).
 * Dùng chung cho:
 *  - Zalo OA OpenAPI (webhook)
 *  - zca-js personal account (listener)
 *
 * ⚠️ Personal (zca-js) là unofficial — rủi ro khóa acc. Nên dùng ACC PHỤ.
 */
import { customAlphabet } from 'nanoid';
import { one, run, many, getSetting } from '../db/schema.js';
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
import { getSiteUrl } from '../utils/urls.js';

const genBind = customAlphabet('0123456789', 6);
const genPass = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 10);

function formatVnd(n) {
  return `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;
}

function menuText() {
  const site = getSiteUrl();
  return (
    `📋 MENU HoanTienVN\n\n` +
    `🌐 Website: ${site}\n` +
    `   Ví · rút tiền · lấy link · mời bạn\n\n` +
    `🔗 Gửi link Shopee — lấy link hoàn tiền\n` +
    `💰 sodu — số dư ví\n` +
    `🏷 subid — mã tracking Aff\n` +
    `📦 don — đơn gần đây\n` +
    `🔑 lienket 123456 — gắn TK web (mã 6 số từ Dashboard)\n` +
    `📝 dangky — tạo TK nhanh (chỉ bot; login web cần liên kết)\n` +
    `❓ menu — menu này\n\n` +
    `Liên kết web:\n` +
    `1) Mở ${site} → đăng ký/login\n` +
    `2) Dashboard → Tạo mã Zalo\n` +
    `3) Gửi: lienket xxxxxx\n` +
    `→ Cùng ví / sub_id với website\n\n` +
    `Mẹo: chỉ cần dán link shopee.vn!`
  );
}

async function findByZalo(zaloUserId) {
  if (!zaloUserId) return null;
  return one('SELECT * FROM users WHERE zalo_id = ?', [String(zaloUserId)]);
}

async function ensureZaloUser(zaloUserId, displayName) {
  let user = await findByZalo(zaloUserId);
  if (user) return user;

  const email = `zalo_${zaloUserId}@zalo.hoantien.local`;
  const existing = await one('SELECT * FROM users WHERE email = ?', [email]);
  const name =
    (displayName && String(displayName).trim()) ||
    `Zalo ${String(zaloUserId).slice(-6)}`;

  if (existing) {
    await run('UPDATE users SET zalo_id = ?, zalo_name = ? WHERE id = ?', [
      String(zaloUserId),
      name,
      existing.id,
    ]);
    return one('SELECT * FROM users WHERE id = ?', [existing.id]);
  }

  let code = generateReferralCode();
  while (await one('SELECT id FROM users WHERE referral_code = ?', [code])) {
    code = generateReferralCode();
  }

  const info = await run(
    `INSERT INTO users (email, password_hash, name, referral_code, zalo_id, zalo_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [email, hashPassword(genPass()), name, code, String(zaloUserId), name]
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
    `✅ Link hoàn tiền\n\n` +
    `📦 ${result.productName || 'Sản phẩm'}\n` +
    `${priceLine}\n` +
    `${cashLine}\n` +
    `🏷 sub_id: ${subId}\n\n` +
    `🔗 Mua ngay:\n${outbound}\n\n` +
    `📎 Short: ${short}\n\n` +
    `⚠️ Click link → mua trong 20–30 phút. Không cần khai báo đơn.`
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
          `${i + 1}. #${o.order_id || '—'} · ${formatVnd(o.cashback_amount)} · ${o.status}${
            o.source === 'import' ? ' (auto)' : ''
          }`
      )
      .join('\n')
  );
}

async function cmdBind(zaloUserId, code) {
  const bindCode = String(code || '').trim();
  if (!/^\d{6}$/.test(bindCode)) {
    return '❌ Mã 6 số. Trên web: Ví → Tạo mã Zalo → nhắn: lienket 123456';
  }
  const user = await one('SELECT * FROM users WHERE zalo_bind_code = ?', [
    bindCode,
  ]);
  if (!user) return '❌ Mã sai hoặc đã dùng. Tạo mã mới trên website.';

  await run('UPDATE users SET zalo_id = NULL WHERE zalo_id = ?', [
    String(zaloUserId),
  ]);
  await run(
    `UPDATE users SET zalo_id = ?, zalo_bind_code = NULL WHERE id = ?`,
    [String(zaloUserId), user.id]
  );

  return (
    `✅ Đã liên kết Zalo\n` +
    `👤 ${user.name}\n` +
    `📧 ${user.email}\n` +
    `🏷 Sub ID: ${generateSubId(user)}\n\n` +
    `Gửi link Shopee để lấy link hoàn tiền!`
  );
}

/**
 * Xử lý 1 tin nhắn Zalo → trả chuỗi reply (không gửi).
 */
export async function handleZaloMessage({
  zaloUserId,
  text,
  displayName,
  eventName,
}) {
  if (!zaloUserId) return null;
  const raw = (text || '').trim();
  if (!raw) {
    return 'Gửi link Shopee hoặc gõ menu nhé!';
  }

  const cmd = raw.replace(/@\w+/g, '').trim();
  const lower = cmd.toLowerCase();

  if (
    /^(menu|help|start|\/start|\/menu|\/help)$/i.test(lower) ||
    lower === 'hi' ||
    lower === 'hello' ||
    lower === 'xin chào'
  ) {
    await ensureZaloUser(zaloUserId, displayName);
    const site = getSiteUrl();
    const welcome =
      getSetting('zalo_welcome', '') ||
      `Chào bạn! HoanTienVN — dán link Shopee để lấy link hoàn tiền.\n🌐 Web: ${site}`;
    return welcome + '\n\n' + menuText();
  }

  const bindM = cmd.match(
    /^(?:\/)?(?:lienket|li[eê]n\s*k[eê]t|bind|LIENKET)\s*[:=]?\s*(\d{6})$/i
  );
  if (bindM) {
    return cmdBind(zaloUserId, bindM[1]);
  }

  if (/^(?:\/)?(?:dangky|đăng\s*ký|register)$/i.test(lower)) {
    const user = await ensureZaloUser(zaloUserId, displayName);
    return (
      `✅ Tài khoản Zalo sẵn sàng!\n` +
      `👤 ${user.name}\n` +
      `🏷 Sub ID: ${generateSubId(user)}\n` +
      `Mã GT: ${user.referral_code}\n\n` +
      `Gửi link Shopee đi!`
    );
  }

  let user = await findByZalo(zaloUserId);
  if (!user) user = await ensureZaloUser(zaloUserId, displayName);

  if (/^(?:\/)?(?:sodu|số\s*dư|so\s*du|vi|ví|balance|wallet)$/i.test(lower)) {
    return cmdBalance(user);
  }

  if (/^(?:\/)?(?:subid|sub_id|sub)$/i.test(lower)) {
    return (
      `🏷 Sub ID Shopee Aff:\n${generateSubId(user)}\n\n` +
      `Lọc cột Sub ID trên portal Aff = mã này.`
    );
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

  // OA stub path: empty event without text
  if (eventName && !text) {
    return getSetting('zalo_welcome', '') || menuText();
  }

  return `Chưa hiểu 😅\n→ Dán link Shopee\n→ Hoặc gõ menu`;
}

/**
 * OA webhook: xử lý + gửi qua OpenAPI (nếu có token).
 */
export async function processAndReply({ zaloUserId, text, eventName, displayName }) {
  const reply = await handleZaloMessage({
    zaloUserId,
    text,
    eventName,
    displayName,
  });
  if (reply && zaloUserId) {
    // Ưu tiên zca personal nếu đang online
    try {
      const { isZcaOnline, sendZcaText } = await import('./zcaPersonal.js');
      if (isZcaOnline()) {
        await sendZcaText(zaloUserId, reply);
        return reply;
      }
    } catch {
      /* fall through OA */
    }
    await sendZaloText(zaloUserId, reply);
  }
  return reply;
}

export async function createBindCode(userId) {
  let code = genBind();
  while (await one('SELECT id FROM users WHERE zalo_bind_code = ?', [code])) {
    code = genBind();
  }
  await run('UPDATE users SET zalo_bind_code = ? WHERE id = ?', [code, userId]);
  return code;
}
