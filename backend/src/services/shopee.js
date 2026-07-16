import crypto from 'crypto';

const APP_ID = process.env.SHOPEE_APP_ID || '';
const SECRET = process.env.SHOPEE_SECRET || '';
const API_URL =
  process.env.SHOPEE_API_URL || 'https://open-api.affiliate.shopee.vn/graphql';

export function isShopeeConfigured() {
  return Boolean(APP_ID && SECRET);
}

function buildAuthHeader(payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const factor = `${APP_ID}${timestamp}${payload}${SECRET}`;
  const signature = crypto.createHash('sha256').update(factor).digest('hex');
  return `SHA256 Credential=${APP_ID}, Timestamp=${timestamp}, Signature=${signature}`;
}

async function graphql(query, variables = {}) {
  if (!isShopeeConfigured()) {
    throw new Error('Shopee API chưa cấu hình (SHOPEE_APP_ID / SHOPEE_SECRET)');
  }
  const body = JSON.stringify({ query, variables });
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: buildAuthHeader(body),
    },
    body,
  });
  const data = await res.json();
  if (data.errors?.length) {
    throw new Error(data.errors[0].message || 'Shopee API error');
  }
  return data.data;
}

/** Parse Shopee product URL → itemId / shopId if possible */
export function parseShopeeUrl(url) {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace('www.', '');
    if (
      !host.includes('shopee.vn') &&
      !host.includes('shope.ee') &&
      !host.includes('s.shopee.vn')
    ) {
      return null;
    }

    // Format: shopee.vn/product-name-i.SHOPID.ITEMID
    const pathMatch = u.pathname.match(/-i\.(\d+)\.(\d+)/);
    if (pathMatch) {
      return { shopId: pathMatch[1], itemId: pathMatch[2], originalUrl: url };
    }

    // Format: /product/SHOPID/ITEMID
    const productMatch = u.pathname.match(/\/product\/(\d+)\/(\d+)/);
    if (productMatch) {
      return {
        shopId: productMatch[1],
        itemId: productMatch[2],
        originalUrl: url,
      };
    }

    return { shopId: null, itemId: null, originalUrl: url };
  } catch {
    return null;
  }
}

/** Mock product info for demo mode */
function mockProductFromUrl(url) {
  const parsed = parseShopeeUrl(url);
  const hash = crypto
    .createHash('md5')
    .update(url)
    .digest('hex')
    .slice(0, 6);
  const prices = [89000, 159000, 249000, 350000, 499000, 890000, 1200000];
  const rates = [0.08, 0.1, 0.12, 0.14, 0.15, 0.18, 0.2];
  const idx = parseInt(hash, 16) % prices.length;
  const price = prices[idx];
  const commissionRate = rates[idx];
  const nameFromUrl =
    url
      .split('/')
      .pop()
      ?.split('?')[0]
      ?.replace(/-i\.\d+\.\d+.*/, '')
      ?.replace(/-/g, ' ')
      ?.slice(0, 80) || `Sản phẩm Shopee #${hash}`;

  return {
    productName: decodeURIComponent(nameFromUrl).trim() || `Sản phẩm demo ${hash}`,
    productImage: `https://placehold.co/200x200/FF5722/white?text=Shopee`,
    productPrice: price,
    commissionRate,
    offerLink: null,
    shopId: parsed?.shopId,
    itemId: parsed?.itemId,
    demo: true,
  };
}

/**
 * Lấy thông tin offer + tạo short link affiliate
 * subIds dùng để track user (subId[0] = user referral/short code)
 */
export async function convertToAffiliateLink(originUrl, subIds = []) {
  const shareRatio = parseFloat(process.env.CASHBACK_SHARE_RATIO || '0.70');

  if (!isShopeeConfigured()) {
    const mock = mockProductFromUrl(originUrl);
    const cashbackRate = mock.commissionRate * shareRatio;
    const estimated = Math.round(mock.productPrice * cashbackRate);
    const demoShort = `https://shope.ee/demo${crypto.randomBytes(4).toString('hex')}`;
    return {
      ...mock,
      affiliateUrl: demoShort,
      cashbackRate,
      estimatedCashback: estimated,
      originalUrl: originUrl,
    };
  }

  // Real API: generateShortLink
  const mutation = `
    mutation {
      generateShortLink(input: {
        originUrl: ${JSON.stringify(originUrl)}
        subIds: ${JSON.stringify(subIds.slice(0, 5))}
      }) {
        shortLink
      }
    }
  `;

  const shortData = await graphql(mutation);
  const affiliateUrl = shortData.generateShortLink.shortLink;

  // Try productOfferV2 for commission info
  let productName = null;
  let productImage = null;
  let productPrice = null;
  let commissionRate = 0.1;

  const parsed = parseShopeeUrl(originUrl);
  if (parsed?.itemId) {
    try {
      const q = `
        query {
          productOfferV2(itemId: ${parsed.itemId}, limit: 1) {
            nodes {
              productName
              imageUrl
              priceMin
              commissionRate
              sellerCommissionRate
              shopeeCommissionRate
              offerLink
            }
          }
        }
      `;
      const offer = await graphql(q);
      const node = offer.productOfferV2?.nodes?.[0];
      if (node) {
        productName = node.productName;
        productImage = node.imageUrl;
        productPrice = parseFloat(node.priceMin || 0);
        commissionRate = parseFloat(node.commissionRate || 0.1);
      }
    } catch {
      /* product offer optional */
    }
  }

  if (!productName) {
    const mock = mockProductFromUrl(originUrl);
    productName = mock.productName;
    productImage = mock.productImage;
    productPrice = mock.productPrice;
    commissionRate = mock.commissionRate;
  }

  const cashbackRate = commissionRate * shareRatio;
  const estimatedCashback = Math.round((productPrice || 0) * cashbackRate);

  return {
    productName,
    productImage,
    productPrice,
    commissionRate,
    cashbackRate,
    estimatedCashback,
    affiliateUrl,
    originalUrl: originUrl,
    demo: false,
  };
}

/** Sync conversions from Shopee (last N days) */
export async function fetchConversions({ startTs, endTs, limit = 100 }) {
  if (!isShopeeConfigured()) {
    return { nodes: [], demo: true };
  }

  const query = `
    query {
      conversionReport(
        purchaseTimeStart: ${startTs}
        purchaseTimeEnd: ${endTs}
        limit: ${limit}
      ) {
        nodes {
          purchaseTime
          clickTime
          conversionId
          totalCommission
          netCommission
          utmContent
          orders {
            orderId
            orderStatus
            items {
              itemId
              itemName
              imageUrl
              actualAmount
              itemTotalCommission
              qty
            }
          }
        }
        pageInfo { scrollId hasNextPage }
      }
    }
  `;

  const data = await graphql(query);
  return { ...data.conversionReport, demo: false };
}
