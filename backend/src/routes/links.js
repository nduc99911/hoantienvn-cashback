import { Router } from 'express';
import { one, many, run } from '../db/schema.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { analyzeProduct } from '../services/product.js';
import {
  buildOutboundUrl,
  generateSubId,
  toCanonicalProductLink,
} from '../services/affiliate.js';
import { generateShortCode } from '../utils/auth.js';
import { limitConvert } from '../middleware/rateLimit.js';

const router = Router();

/** Phân tích link — không cần Shopee Open API */
router.post('/preview', optionalAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Vui lòng dán link sản phẩm' });
    const result = await analyzeProduct(url);
    const originLink = toCanonicalProductLink(
      result.productLink,
      result.originalUrl,
      result.shopId,
      result.itemId
    );

    // Preview an_redir (sub_id tạm) nếu đã login
    let sampleAffiliateUrl = null;
    if (req.user) {
      try {
        sampleAffiliateUrl = buildOutboundUrl({
          productLink: result.productLink,
          originalUrl: result.originalUrl,
          shopId: result.shopId,
          itemId: result.itemId,
          subId: 'PREVIEW',
        });
      } catch {
        /* missing aff id */
      }
    }

    res.json({
      productName: result.productName,
      productImage: result.productImage,
      productPrice: result.productPrice,
      shopName: result.shopName || null,
      commissionRate: result.commissionRate,
      commissionAmount: result.commissionAmount ?? null,
      cashbackRate: result.cashbackRate,
      estimatedCashback: result.estimatedCashback,
      categoryLabel: result.categoryLabel,
      dataSource: result.dataSource,
      rating: result.rating || null,
      sales: result.sales ?? null,
      priceUnknown: Boolean(result.priceUnknown),
      shopId: result.shopId,
      itemId: result.itemId,
      platform: result.platform,
      originLink,
      sampleAffiliateUrl,
      needLogin: !req.user,
      noApi: true,
    });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Lỗi phân tích link' });
  }
});

/** Tạo link an_redir + short link (login) */
router.post('/convert', requireAuth, limitConvert, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Vui lòng dán link sản phẩm' });
    }

    const result = await analyzeProduct(url);
    const originLink = toCanonicalProductLink(
      result.productLink,
      result.originalUrl,
      result.shopId,
      result.itemId
    );

    if (result.platform === 'shopee' && (!result.shopId || !result.itemId)) {
      return res.status(400).json({
        error:
          'Không đọc được shop_id/item_id. Hãy dùng link đầy đủ dạng shopee.vn/...-i.SHOP.ITEM',
      });
    }

    // sub_id CỐ ĐỊNH theo user (U2_DEMO2026) — mọi link cùng mã → đối soát Shopee dễ
    const subId = generateSubId(req.user);
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
      // TikTok/Lazada: short link redirect product (wrapper sau)
      outbound = result.productLink || result.originalUrl;
    }

    let shortCode = generateShortCode();
    while (
      await one('SELECT id FROM cashback_links WHERE short_code = ?', [shortCode])
    ) {
      shortCode = generateShortCode();
    }

    const info = await run(
      `INSERT INTO cashback_links
       (user_id, platform, original_url, affiliate_url, short_code, product_name, product_image,
        product_price, commission_rate, cashback_rate, estimated_cashback, sub_id, shop_id, item_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
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
    const shortUrl = shortLinkUrl(shortCode);

    res.json({
      id: info.lastInsertRowid,
      shortCode,
      shortUrl,
      affiliateUrl: outbound,
      originLink,
      subId,
      platform: result.platform,
      productName: result.productName,
      productImage: result.productImage,
      productPrice: result.productPrice,
      shopName: result.shopName || null,
      commissionRate: result.commissionRate,
      commissionAmount: result.commissionAmount ?? null,
      cashbackRate: result.cashbackRate,
      estimatedCashback: result.estimatedCashback,
      categoryLabel: result.categoryLabel,
      dataSource: result.dataSource,
      rating: result.rating || null,
      sales: result.sales ?? null,
      priceUnknown: Boolean(result.priceUnknown),
      noApi: true,
      tip: 'Mở short link / an_redir để mua. Sau nhận hàng → Khai báo mã đơn.',
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || 'Không tạo được link hoàn tiền' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  const links = await many(
    `SELECT * FROM cashback_links WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json({
    links: links.map((l) => ({
      id: l.id,
      shortCode: l.short_code,
      originalUrl: l.original_url,
      affiliateUrl: l.affiliate_url,
      subId: l.sub_id,
      productName: l.product_name,
      productImage: l.product_image,
      productPrice: l.product_price,
      cashbackRate: l.cashback_rate,
      estimatedCashback: l.estimated_cashback,
      clicks: l.clicks,
      createdAt: l.created_at,
    })),
  });
});

export default router;
