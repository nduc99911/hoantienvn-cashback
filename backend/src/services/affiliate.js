/**
 * Tạo link affiliate Shopee kiểu đối thủ (KHÔNG cần Open API):
 *
 * https://s.shopee.vn/an_redir
 *   ?origin_link=https://shopee.vn/product/{shop}/{item}
 *   &affiliate_id=17320010599
 *   &sub_id=XXXX
 *
 * redirect_mode:
 *  - shopee_an_redir (mặc định): công thức an_redir chính thức
 *  - wrapper: template Accesstrade / custom
 *  - direct: sang product (không gắn aff — chỉ test UI)
 */
import { getSetting } from '../db/schema.js';

/**
 * Chuẩn hóa origin_link: https://shopee.vn/product/{shopId}/{itemId}
 */
export function toCanonicalProductLink(productLink, originalUrl, shopId, itemId) {
  if (shopId && itemId) {
    return `https://shopee.vn/product/${shopId}/${itemId}`;
  }
  try {
    const raw = productLink || originalUrl || '';
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const m =
      u.pathname.match(/-i\.(\d+)\.(\d+)/i) ||
      u.pathname.match(/\/product\/(\d+)\/(\d+)/);
    if (m) return `https://shopee.vn/product/${m[1]}/${m[2]}`;
  } catch {
    /* ignore */
  }
  return productLink || originalUrl;
}

/**
 * Link an_redir — đúng format đối thủ / portal Shopee Affiliate
 */
export function buildShopeeAnRedir({ originLink, affiliateId, subId }) {
  const id = String(affiliateId || '').trim();
  if (!id) {
    throw new Error(
      'Chưa cấu hình SHOPEE_AFFILIATE_ID (Admin → Cấu hình hoặc file .env)'
    );
  }
  if (!originLink) throw new Error('Thiếu origin_link sản phẩm');

  const params = new URLSearchParams();
  params.set('origin_link', originLink);
  params.set('affiliate_id', id);
  if (subId) params.set('sub_id', String(subId));

  return `https://s.shopee.vn/an_redir?${params.toString()}`;
}

/**
 * sub_id CỐ ĐỊNH theo user — dễ đối soát trên Shopee Affiliate.
 *
 * Trên portal Shopee báo cáo conversion có 2 cột riêng:
 *   - Sub ID  = mã user (cái này)
 *   - Order ID = mã đơn hàng
 * → Ghép lại chính là "mã user + đơn hàng" khi đối soát, không cần nhét order vào sub_id
 *   (vì lúc tạo link chưa có mã đơn).
 *
 * Format mặc định: U{userId}_{referralCode}  vd: U2_DEMO2026
 * (chỉ A-Z 0-9 _, tối đa 40 ký tự — an toàn với Shopee)
 */
export function generateSubId(user) {
  if (!user) return 'GUEST';
  const mode = getSetting('sub_id_format', 'user_code') || 'user_code';

  const ref = String(user.referral_code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);

  if (mode === 'referral_only' && ref) {
    return ref.slice(0, 40);
  }

  // user_code (mặc định): U{id}_{REF} — filter trên Shopee rõ user
  const idPart = `U${user.id}`;
  if (ref) return `${idPart}_${ref}`.slice(0, 40);
  return idPart;
}

/** Parse sub_id từ báo cáo Shopee → user id / referral */
export function parseSubId(subId) {
  const s = String(subId || '').trim();
  if (!s) return {};
  const m = s.match(/^U(\d+)(?:_([A-Z0-9]+))?$/i);
  if (m) {
    return { userId: Number(m[1]), referralCode: m[2] || null, raw: s };
  }
  // referral only
  if (/^[A-Z0-9]{4,20}$/i.test(s)) {
    return { userId: null, referralCode: s.toUpperCase(), raw: s };
  }
  return { raw: s };
}

/** Nhãn đối soát hiển thị: USER + ORDER */
export function reconcileKey(subId, orderId) {
  return `${subId || '?'}+${orderId || '?'}`;
}

export function buildOutboundUrl({
  productLink,
  originalUrl,
  shopId,
  itemId,
  subId,
}) {
  const mode = getSetting('redirect_mode', 'shopee_an_redir') || 'shopee_an_redir';
  const originLink = toCanonicalProductLink(
    productLink,
    originalUrl,
    shopId,
    itemId
  );

  if (mode === 'shopee_an_redir' || mode === 'an_redir') {
    const affiliateId =
      getSetting('shopee_affiliate_id', '') ||
      process.env.SHOPEE_AFFILIATE_ID ||
      '';
    return buildShopeeAnRedir({
      originLink,
      affiliateId,
      subId,
    });
  }

  if (mode === 'wrapper') {
    const wrapper = (getSetting('affiliate_wrapper', '') || '').trim();
    if (wrapper) {
      return wrapper
        .replace(/\{encoded_url\}/gi, encodeURIComponent(originLink))
        .replace(/\{url\}/gi, originLink)
        .replace(/\{sub_id\}/gi, encodeURIComponent(subId || ''))
        .replace(/\{subId\}/gi, encodeURIComponent(subId || ''))
        .replace(/\{affiliate_id\}/gi, getSetting('shopee_affiliate_id', ''));
    }
  }

  // direct fallback
  try {
    const u = new URL(originLink);
    if (subId) u.searchParams.set('utm_content', subId);
    return u.toString();
  } catch {
    return originLink;
  }
}

export function describeAffiliateSetup() {
  const mode = getSetting('redirect_mode', 'shopee_an_redir');
  const affiliateId =
    getSetting('shopee_affiliate_id', '') || process.env.SHOPEE_AFFILIATE_ID || '';
  const wrapper = getSetting('affiliate_wrapper', '');

  return {
    mode,
    affiliateId: affiliateId || null,
    hasAffiliateId: Boolean(affiliateId),
    hasWrapper: Boolean(wrapper && wrapper.trim()),
    needsShopeeOpenApi: false,
    sampleAnRedir: affiliateId
      ? buildShopeeAnRedir({
          originLink: 'https://shopee.vn/product/684726466/23922474647',
          affiliateId,
          subId: 'SAMPLE_SUB_ID',
        })
      : null,
    howItWorks: [
      '1. Parse link user → shop_id + item_id → origin_link = /product/{shop}/{item}',
      '2. Ghép https://s.shopee.vn/an_redir?origin_link=...&affiliate_id=...&sub_id=...',
      '3. affiliate_id cố định (acc Affiliate master của bạn)',
      '4. sub_id map user → dùng đối soát conversion / claim đơn',
      '5. User click → Shopee set cookie aff → mua → hoa hồng về portal của bạn',
      '6. Admin duyệt claim hoặc import CSV theo sub_id',
    ],
  };
}
