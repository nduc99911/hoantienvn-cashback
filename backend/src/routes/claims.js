import { Router } from 'express';
import { db, getSetting } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { limitClaim } from '../middleware/rateLimit.js';
import { recordPendingOrder } from '../services/wallet.js';
import { estimateCommissionRate } from '../services/product.js';
import { evaluateClaimFraud } from '../services/fraud.js';
import { createNotification } from '../services/notifications.js';
import { notifyNewClaim } from '../services/telegram.js';
import { generateSubId, reconcileKey } from '../services/affiliate.js';

const router = Router();

/**
 * Khai báo ĐƠN THIẾU — tuỳ chọn.
 * Luồng chính: mua qua link (sub_id = mã user) → admin import CSV → tự hold.
 * Form này chỉ khi đơn không vào sau 3–7 ngày.
 *
 * Body tối giản: { orderId, orderAmount? }
 */
router.post('/', requireAuth, limitClaim, async (req, res) => {
  try {
    const {
      orderId,
      orderAmount,
      productName,
      claimNote,
      linkId,
      purchaseTime,
      platform = 'shopee',
    } = req.body;

    if (!orderId || String(orderId).trim().length < 4) {
      return res.status(400).json({
        error: 'Chỉ cần dán Mã đơn hàng Shopee',
      });
    }

    const amount = Number(orderAmount) || 0;
    // amount optional — admin/import sẽ chốt; claim thiếu cho phép 0 rồi admin sửa

    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket.remoteAddress;

    const fraud = evaluateClaimFraud(req.user, {
      orderId,
      orderAmount: amount || 1000,
      ip,
    });

    if (fraud.block && fraud.flags.includes('duplicate_order')) {
      return res.status(400).json({
        error: fraud.blockReason,
        fraudScore: fraud.score,
        fraudFlags: fraud.flags,
      });
    }

    // Đã có từ import?
    const existing = db
      .prepare('SELECT id, status, source FROM orders WHERE order_id = ?')
      .get(String(orderId).trim());
    if (existing) {
      return res.status(400).json({
        error:
          existing.source === 'import'
            ? 'Đơn này đã được hệ thống ghi nhận tự động từ báo cáo Shopee — không cần khai báo.'
            : 'Mã đơn đã tồn tại trên hệ thống',
        orderDbId: existing.id,
        status: existing.status,
      });
    }

    let resolvedLinkId = linkId || null;
    let productImage = null;
    let estRate = estimateCommissionRate(productName || '', platform).rate;
    let plat = platform || 'shopee';
    const userSubId = generateSubId(req.user);

    if (linkId) {
      const link = db
        .prepare('SELECT * FROM cashback_links WHERE id = ? AND user_id = ?')
        .get(linkId, req.user.id);
      if (link) {
        resolvedLinkId = link.id;
        productImage = link.product_image;
        if (link.commission_rate) estRate = link.commission_rate;
        if (link.platform) plat = link.platform;
      }
    } else {
      const link = db
        .prepare(
          `SELECT * FROM cashback_links WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
        )
        .get(req.user.id);
      if (link) {
        resolvedLinkId = link.id;
        productImage = link.product_image;
      }
    }

    const shareRatio = parseFloat(getSetting('cashback_share_ratio', '0.70'));
    const useAmount = amount > 0 ? amount : 0;
    const totalCommission =
      useAmount > 0 ? Math.round(useAmount * estRate) : 0;
    const cashbackAmount =
      useAmount > 0 ? Math.round(totalCommission * shareRatio) : 0;

    const oid = String(orderId).trim();
    const order = recordPendingOrder({
      userId: req.user.id,
      linkId: resolvedLinkId,
      orderId: oid,
      productName:
        productName ||
        `Báo thiếu #${oid} (${reconcileKey(userSubId, oid)})`,
      productImage,
      orderAmount: useAmount,
      totalCommission,
      cashbackAmount,
      purchaseTime: purchaseTime || new Date().toISOString(),
      source: 'claim',
      claimNote:
        (claimNote || 'User báo đơn thiếu') +
        ` · sub_id=${userSubId}`,
      status: 'pending_review',
      platform: plat,
      fraudScore: fraud.score,
      fraudFlags: fraud.flags,
    });

    createNotification({
      roleTarget: 'admin',
      type: 'claim_missing',
      title: 'Báo đơn thiếu',
      body: `${req.user.name} · #${oid} · sub ${userSubId}`,
      meta: { orderId: order.id },
    });

    notifyNewClaim({
      userName: req.user.name,
      userId: req.user.id,
      orderId: oid,
      orderAmount: useAmount,
      cashbackAmount,
      fraudScore: fraud.score,
      fraudFlags: fraud.flags,
      platform: plat,
    }).catch(() => {});

    res.json({
      success: true,
      orderId: order.id,
      cashbackAmount,
      status: 'pending_review',
      subId: userSubId,
      reconcileKey: reconcileKey(userSubId, oid),
      message:
        useAmount > 0
          ? 'Đã gửi báo đơn thiếu. Admin đối soát trên Shopee Aff (Sub ID + Mã đơn).'
          : 'Đã gửi mã đơn. Admin sẽ khớp hoa hồng từ báo cáo Shopee — bạn không cần nhập giá.',
      tip: 'Luồng thường: không cần form này. Chỉ dùng khi quá 3–7 ngày chưa thấy đơn trong ví.',
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM orders WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 100`
    )
    .all(req.user.id);

  const timelineStatus = {
    pending_review: 1,
    pending: 2,
    held: 3,
    paid: 4,
    rejected: 0,
    cancelled: 0,
    completed: 2,
  };

  const subId = generateSubId(req.user);

  res.json({
    claims: rows.map((o) => ({
      id: o.id,
      orderId: o.order_id,
      platform: o.platform,
      productName: o.product_name,
      productImage: o.product_image,
      orderAmount: o.order_amount,
      cashbackAmount: o.cashback_amount,
      status: o.status,
      source: o.source,
      claimNote: o.claim_note,
      adminNote: o.admin_note,
      fraudScore: o.fraud_score,
      holdUntil: o.hold_until,
      purchaseTime: o.purchase_time,
      createdAt: o.created_at,
      step: timelineStatus[o.status] ?? 1,
      auto: o.source === 'import',
    })),
    subId,
    reconcileHint: `Trên Shopee Aff: lọc Sub ID = ${subId} → cột Order ID = mã đơn`,
    guide:
      getSetting('claim_guide', '') ||
      'Mua qua link hoàn tiền là đủ. Đơn tự vào khi admin import báo cáo. Chỉ báo thiếu nếu sau 3–7 ngày chưa thấy.',
    holdDays: parseInt(getSetting('hold_days', '7'), 10),
    claimOptional: true,
  });
});

export default router;
