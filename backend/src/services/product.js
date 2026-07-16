/**
 * Phân tích link + lấy thông tin sản phẩm thật (không Shopee Open API Affiliate)
 * Nguồn (theo thứ tự):
 *  1. data.addlivetag.com product-data (tên, giá, ảnh, hoa hồng)
 *  2. Shopee public/pdp endpoints
 *  3. HTML meta og:* từ trang sản phẩm
 *  4. Parse slug URL (chỉ tên — không bịa giá)
 */
import { db, getSetting } from '../db/schema.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export function detectPlatform(url) {
  try {
    const h = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      .replace(/^www\./, '')
      .toLowerCase();
    if (
      h.includes('shopee') ||
      h.includes('shope.ee') ||
      h.includes('shp.ee')
    )
      return 'shopee';
    if (h.includes('tiktok') || h.includes('tokopedia')) return 'tiktok';
    if (h.includes('lazada')) return 'lazada';
  } catch {
    /* ignore */
  }
  return null;
}

export function isShopeeHost(hostname = '') {
  const h = hostname.replace(/^www\./, '').toLowerCase();
  return (
    h === 'shopee.vn' ||
    h.endsWith('.shopee.vn') ||
    h === 'shope.ee' ||
    h === 's.shopee.vn' ||
    h === 'vn.shp.ee' ||
    h.endsWith('shp.ee')
  );
}

export function parseShopeeUrl(raw) {
  try {
    let input = String(raw).trim();
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    const u = new URL(input);
    if (!isShopeeHost(u.hostname)) return null;

    // -i.SHOP.ITEM (có thể sau slug đã encode)
    let m = u.pathname.match(/-i\.(\d+)\.(\d+)/i);
    if (m) {
      return {
        platform: 'shopee',
        shopId: m[1],
        itemId: m[2],
        originalUrl: input,
        productLink: `https://shopee.vn/product/${m[1]}/${m[2]}`,
      };
    }
    m = u.pathname.match(/\/product\/(\d+)\/(\d+)/);
    if (m) {
      return {
        platform: 'shopee',
        shopId: m[1],
        itemId: m[2],
        originalUrl: input,
        productLink: `https://shopee.vn/product/${m[1]}/${m[2]}`,
      };
    }
    m = u.pathname.match(/\/opaanlp\/(\d+)\/(\d+)/);
    if (m) {
      return {
        platform: 'shopee',
        shopId: m[1],
        itemId: m[2],
        originalUrl: input,
        productLink: `https://shopee.vn/product/${m[1]}/${m[2]}`,
      };
    }
    const itemId = u.searchParams.get('item_id') || u.searchParams.get('itemId');
    const shopId = u.searchParams.get('shop_id') || u.searchParams.get('shopId');
    if (itemId) {
      return {
        platform: 'shopee',
        shopId: shopId || null,
        itemId: String(itemId),
        originalUrl: input,
        productLink: shopId
          ? `https://shopee.vn/product/${shopId}/${itemId}`
          : input,
      };
    }
    return {
      platform: 'shopee',
      shopId: null,
      itemId: null,
      originalUrl: input,
      productLink: input,
      isShort: true,
    };
  } catch {
    return null;
  }
}

export function parseTikTokUrl(raw) {
  try {
    let input = String(raw).trim();
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    const u = new URL(input);
    const h = u.hostname.toLowerCase();
    if (!h.includes('tiktok') && !h.includes('tokopedia')) return null;
    return {
      platform: 'tiktok',
      shopId: null,
      itemId: u.pathname.split('/').filter(Boolean).pop() || null,
      originalUrl: input,
      productLink: input,
    };
  } catch {
    return null;
  }
}

export function parseLazadaUrl(raw) {
  try {
    let input = String(raw).trim();
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    const u = new URL(input);
    if (!u.hostname.toLowerCase().includes('lazada')) return null;
    const m =
      u.pathname.match(/-i(\d+)/i) ||
      u.pathname.match(/\/products\/.*?(\d+)\.html/i);
    return {
      platform: 'lazada',
      shopId: null,
      itemId: m ? m[1] : null,
      originalUrl: input,
      productLink: input,
    };
  } catch {
    return null;
  }
}

export async function expandShortUrl(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
    });
    return res.url || url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

/** Decode slug → tên đọc được (UTF-8) */
function guessNameFromUrl(url) {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const slug = path
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/-i\.\d+\.\d+.*/i, '')
      ?.replace(/-i\d+.*/i, '')
      ?.replace(/\.html$/i, '')
      ?.replace(/-/g, ' ')
      ?.trim();
    if (slug && slug.length > 3 && !/^\d+$/.test(slug)) {
      return slug.slice(0, 160);
    }
  } catch {
    try {
      // fallback nếu URL chứa encode 2 lần / lỗi
      const path = new URL(url).pathname;
      const slug = path
        .split('/')
        .filter(Boolean)
        .pop()
        ?.replace(/-i\.\d+\.\d+.*/i, '')
        ?.replace(/-/g, ' ');
      if (slug && slug.length > 3) return decodeURIComponent(slug).slice(0, 160);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Bỏ dấu để match rate card ổn định hơn */
function stripVi(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export function estimateCommissionRate(productName = '', platform = 'shopee') {
  const defaultRate = parseFloat(getSetting('default_commission_rate', '0.12'));
  const name = stripVi(productName);
  const cards = db
    .prepare(
      `SELECT * FROM rate_cards WHERE platform = ? OR platform = 'all' ORDER BY sort_order ASC`
    )
    .all(platform);

  for (const card of cards) {
    if (card.keyword === 'default') continue;
    const parts = card.keyword.split('|').map((s) => stripVi(s.trim()));
    // Ưu tiên từ khóa dài hơn / cụ thể
    if (parts.some((p) => p && p.length >= 3 && name.includes(p))) {
      return { rate: card.commission_rate, label: card.label };
    }
  }
  const defCard = cards.find((c) => c.keyword === 'default');
  if (defCard) return { rate: defCard.commission_rate, label: defCard.label };
  return { rate: defaultRate, label: 'Mặc định' };
}

function normalizeShopeePrice(raw) {
  if (raw == null || raw === '') return null;
  let price = Number(raw);
  if (!Number.isFinite(price) || price <= 0) return null;
  // Shopee API thường * 100000
  if (price >= 100000) {
    // 2850000000 -> 28500; 14900000 -> 149
    // Heuristic: nếu >= 1e7 coi là đơn vị Shopee
    if (price >= 1e7) price = Math.round(price / 100000);
    else if (price > 5000000) price = Math.round(price / 100000);
  }
  return Math.round(price);
}

function normalizeImage(img) {
  if (!img) return null;
  const s = String(img);
  if (s.startsWith('http')) return s.split('_tn')[0];
  // hash ảnh shopee
  return `https://down-vn.img.susercontent.com/file/${s.replace(/^file\//, '')}`;
}

async function fetchJson(url, headers = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        ...headers,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 1) AddLiveTag product data — ổn định, có commission */
export async function fetchFromAddLiveTag({ itemId, url }) {
  try {
    const qs = itemId
      ? `item_id=${encodeURIComponent(itemId)}`
      : `url=${encodeURIComponent(url)}`;
    const json = await fetchJson(
      `https://data.addlivetag.com/product-data/product-data.php?${qs}`,
      {},
      12000
    );
    if (!json || json.status !== 'success' || !json.productInfo) return null;
    const p = json.productInfo;
    if (!p.productName && !p.price && !p.imageUrl) return null;

    const price = normalizeShopeePrice(p.price ?? p.priceStats?.currentPrice);
    const commission =
      p.commission != null ? Number(p.commission) : null;

    return {
      productName: p.productName || null,
      productPrice: price,
      productImage: normalizeImage(p.imageUrl),
      shopName: p.shopName || null,
      commissionAmount: Number.isFinite(commission) ? commission : null,
      rating: p.rating != null ? String(p.rating) : null,
      sales: p.sales != null ? Number(p.sales) : null,
      source: 'addlivetag',
    };
  } catch {
    return null;
  }
}

/** 2) Shopee unofficial endpoints */
export async function fetchFromShopeeApi(shopId, itemId) {
  if (!shopId || !itemId) return null;

  const headersBase = {
    Referer: `https://shopee.vn/product/${shopId}/${itemId}`,
    'X-Shopee-Language': 'vi',
    'X-API-SOURCE': 'pc',
    'X-Requested-With': 'XMLHttpRequest',
    Aff: '1',
  };

  const endpoints = [
    `https://shopee.vn/api/v4/pdp/get_pc?shop_id=${shopId}&item_id=${itemId}`,
    `https://shopee.vn/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`,
    `https://shopee.vn/api/v2/item/get?itemid=${itemId}&shopid=${shopId}`,
  ];

  for (const ep of endpoints) {
    const json = await fetchJson(ep, headersBase, 8000);
    if (!json) continue;

    const item =
      json?.data?.item ||
      json?.data?.product_info?.item ||
      json?.item ||
      json?.data;

    if (!item || typeof item !== 'object') continue;

    const name = item.name || item.title || item.item_name || null;
    let price =
      item.price_min ??
      item.price ??
      item.price_before_discount ??
      item.min_price ??
      null;
    // nested
    if (price == null && item.price_info) {
      price = item.price_info.price_min ?? item.price_info.price;
    }
    price = normalizeShopeePrice(price);

    let image =
      item.image ||
      item.images?.[0] ||
      item.image_url ||
      item.cover ||
      null;
    image = normalizeImage(image);

    if (name || price || image) {
      return {
        productName: name,
        productPrice: price,
        productImage: image,
        shopName: item.shop_name || null,
        source: 'shopee_api',
      };
    }
  }
  return null;
}

/** 3) Scrape meta tags từ HTML trang SP */
export async function fetchFromHtmlMeta(productLink) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(productLink, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();

    const meta = (prop) => {
      const re1 = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        'i'
      );
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
        'i'
      );
      const m = html.match(re1) || html.match(re2);
      return m ? decodeHtml(m[1]) : null;
    };

    let title =
      meta('og:title') ||
      meta('twitter:title') ||
      null;
    if (!title) {
      const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (tm) {
        title = decodeHtml(tm[1])
          .replace(/\s*[|\-–].*Shopee.*/i, '')
          .trim();
      }
    }

    let image = meta('og:image') || meta('twitter:image');
    let priceRaw =
      meta('product:price:amount') || meta('og:price:amount') || null;
    let price = priceRaw ? normalizeShopeePrice(priceRaw) : null;

    // JSON-LD Product
    const ldMatches = html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    for (const m of ldMatches) {
      try {
        const data = JSON.parse(m[1]);
        const nodes = Array.isArray(data) ? data : [data];
        for (const node of nodes) {
          const graph = node['@graph'] || [node];
          for (const g of graph) {
            const types = Array.isArray(g['@type'])
              ? g['@type']
              : [g['@type']];
            if (!types.includes('Product')) continue;
            if (!title && g.name) title = g.name;
            if (!price && g.offers) {
              const offers = Array.isArray(g.offers) ? g.offers[0] : g.offers;
              if (offers?.price) price = normalizeShopeePrice(offers.price);
            }
            if (!image && g.image) {
              const img = Array.isArray(g.image) ? g.image[0] : g.image;
              if (typeof img === 'string') image = img;
              else if (img?.url) image = img.url;
            }
          }
        }
      } catch {
        /* ignore bad json-ld */
      }
    }

    if (title || price || image) {
      return {
        productName: title ? title.replace(/\s*\|.*$/i, '').trim() : null,
        productPrice: price,
        productImage: image,
        source: 'html_meta',
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function decodeHtml(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );
}

/**
 * Gộp nhiều nguồn → info sản phẩm tốt nhất
 */
export async function fetchProductInfo({ shopId, itemId, productLink, originalUrl }) {
  const results = [];

  // Parallel: addlivetag + shopee api
  const [addLive, shopeeApi] = await Promise.all([
    fetchFromAddLiveTag({
      itemId,
      url: productLink || originalUrl,
    }),
    shopId && itemId
      ? fetchFromShopeeApi(shopId, itemId)
      : Promise.resolve(null),
  ]);

  if (addLive) results.push(addLive);
  if (shopeeApi) results.push(shopeeApi);

  // HTML fallback nếu thiếu tên/giá/ảnh
  const needHtml =
    !results.length ||
    results.every((r) => !r.productName || !r.productPrice || !r.productImage);

  if (needHtml && (productLink || originalUrl)) {
    const htmlInfo = await fetchFromHtmlMeta(productLink || originalUrl);
    if (htmlInfo) results.push(htmlInfo);
  }

  if (!results.length) return null;

  // Merge: ưu tiên field không null, ưu tiên nguồn có commission
  const merged = {
    productName: null,
    productPrice: null,
    productImage: null,
    shopName: null,
    commissionAmount: null,
    rating: null,
    sales: null,
    source: results.map((r) => r.source).join('+'),
  };

  // Ưu tiên addlivetag cho commission & price
  const byPriority = [
    ...results.filter((r) => r.source === 'addlivetag'),
    ...results.filter((r) => r.source === 'shopee_api'),
    ...results.filter((r) => r.source === 'html_meta'),
  ];

  for (const r of byPriority) {
    if (!merged.productName && r.productName) merged.productName = r.productName;
    if (merged.productPrice == null && r.productPrice != null)
      merged.productPrice = r.productPrice;
    if (!merged.productImage && r.productImage)
      merged.productImage = r.productImage;
    if (!merged.shopName && r.shopName) merged.shopName = r.shopName;
    if (merged.commissionAmount == null && r.commissionAmount != null)
      merged.commissionAmount = r.commissionAmount;
    if (!merged.rating && r.rating) merged.rating = r.rating;
    if (merged.sales == null && r.sales != null) merged.sales = r.sales;
  }

  return merged;
}

export async function analyzeProduct(rawUrl) {
  let url = String(rawUrl).trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const platform = detectPlatform(url);
  if (!platform) {
    throw new Error(
      'Link không hỗ trợ. Dùng link Shopee / TikTok Shop / Lazada'
    );
  }
  if (getSetting(`enable_${platform}`, '1') !== '1') {
    throw new Error(`Nền tảng ${platform} đang tắt`);
  }

  if (platform === 'shopee') return analyzeShopeeProduct(url);
  if (platform === 'tiktok') return analyzeGeneric(url, 'tiktok', 'TikTok Shop');
  return analyzeGeneric(url, 'lazada', 'Lazada');
}

async function analyzeGeneric(url, platform, label) {
  const parsed =
    platform === 'tiktok' ? parseTikTokUrl(url) : parseLazadaUrl(url);
  if (!parsed) throw new Error(`Link ${label} không hợp lệ`);

  const productName =
    guessNameFromUrl(url) || `Sản phẩm ${label} ${parsed.itemId || ''}`.trim();
  const { rate, label: cat } = estimateCommissionRate(productName, platform);
  const shareRatio = parseFloat(getSetting('cashback_share_ratio', '0.70'));

  return {
    platform,
    shopId: parsed.shopId,
    itemId: parsed.itemId,
    originalUrl: url,
    productLink: parsed.productLink || url,
    productName,
    productImage: null,
    productPrice: null,
    commissionRate: rate,
    cashbackRate: rate * shareRatio,
    estimatedCashback: null,
    categoryLabel: cat,
    dataSource: 'url_only',
    priceUnknown: true,
  };
}

export async function analyzeShopeeProduct(rawUrl) {
  let url = String(rawUrl).trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let parsed = parseShopeeUrl(url);
  if (!parsed) {
    throw new Error(
      'Link không hợp lệ. Hãy dán link Shopee (shopee.vn / s.shopee.vn / shope.ee)'
    );
  }

  // Expand short link
  if (parsed.isShort || !parsed.itemId) {
    const host = new URL(url).hostname;
    if (
      host.includes('shope.ee') ||
      host.includes('s.shopee') ||
      host.includes('shp.ee')
    ) {
      const expanded = await expandShortUrl(url);
      const reparsed = parseShopeeUrl(expanded);
      if (reparsed?.itemId) {
        parsed = reparsed;
        url = expanded;
      }
    }
  }

  const productLink =
    parsed.productLink ||
    (parsed.shopId && parsed.itemId
      ? `https://shopee.vn/product/${parsed.shopId}/${parsed.itemId}`
      : url);

  // Tên tạm từ URL (UTF-8 decode đúng)
  let productName = guessNameFromUrl(url) || guessNameFromUrl(productLink);
  let productPrice = null;
  let productImage = null;
  let shopName = null;
  let commissionAmount = null;
  let dataSource = 'url_parse';
  let rating = null;
  let sales = null;

  if (parsed.shopId || parsed.itemId || productLink) {
    const info = await fetchProductInfo({
      shopId: parsed.shopId,
      itemId: parsed.itemId,
      productLink,
      originalUrl: url,
    });
    if (info) {
      if (info.productName) productName = info.productName;
      if (info.productPrice != null) productPrice = info.productPrice;
      if (info.productImage) productImage = info.productImage;
      if (info.shopName) shopName = info.shopName;
      if (info.commissionAmount != null) commissionAmount = info.commissionAmount;
      if (info.rating) rating = info.rating;
      if (info.sales != null) sales = info.sales;
      dataSource = info.source || dataSource;
    }
  }

  if (!productName) {
    productName = parsed.itemId
      ? `Sản phẩm Shopee #${parsed.itemId}`
      : 'Sản phẩm Shopee';
  }

  // Không bịa giá — null nếu không lấy được
  const shareRatio = parseFloat(getSetting('cashback_share_ratio', '0.70'));

  let commissionRate;
  let categoryLabel;
  let estimatedCashback = null;

  if (commissionAmount != null && productPrice > 0) {
    commissionRate = commissionAmount / productPrice;
    categoryLabel = 'Theo dữ liệu affiliate';
    estimatedCashback = Math.round(commissionAmount * shareRatio);
  } else {
    const est = estimateCommissionRate(productName, 'shopee');
    commissionRate = est.rate;
    categoryLabel = est.label;
    if (productPrice != null) {
      estimatedCashback = Math.round(productPrice * commissionRate * shareRatio);
    }
  }

  const cashbackRate = commissionRate * shareRatio;

  return {
    platform: 'shopee',
    shopId: parsed.shopId,
    itemId: parsed.itemId,
    originalUrl: url,
    productLink,
    productName,
    productImage,
    productPrice,
    shopName,
    commissionRate,
    commissionAmount,
    cashbackRate,
    estimatedCashback,
    categoryLabel,
    dataSource,
    rating,
    sales,
    priceUnknown: productPrice == null,
  };
}
