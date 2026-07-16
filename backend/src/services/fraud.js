import { one, getSetting, sqlNowMinusDays, sqlStartOfDay } from '../db/schema.js';

export async function evaluateClaimFraud(user, { orderId, orderAmount, ip }) {
  const flags = [];
  let score = 0;
  let block = false;
  let blockReason = null;

  const dup = await one('SELECT id, user_id FROM orders WHERE order_id = ?', [
    String(orderId).trim(),
  ]);
  if (dup) {
    block = true;
    blockReason =
      dup.user_id === user.id
        ? 'Bạn đã khai báo mã đơn này rồi'
        : 'Mã đơn đã tồn tại trên hệ thống';
    flags.push('duplicate_order');
    score += 100;
  }

  const windowDays = parseInt(getSetting('claim_click_window_days', '14'), 10) || 14;
  const requireClick = getSetting('require_click_before_claim', '1') === '1';
  const recentClick = await one(
    `SELECT id, created_at FROM click_logs
     WHERE user_id = ? AND created_at >= ${sqlNowMinusDays(windowDays)}
     ORDER BY created_at DESC LIMIT 1`,
    [user.id]
  );

  if (!recentClick) {
    flags.push('no_recent_click');
    score += 40;
    if (requireClick && getSetting('hard_block_no_click', '0') === '1') {
      block = true;
      blockReason = `Không thấy click link hoàn tiền trong ${windowDays} ngày gần đây`;
    }
  }

  const maxPerDay = parseInt(getSetting('max_claims_per_day', '10'), 10) || 10;
  const todayCount = await one(
    `SELECT COUNT(*) as c FROM orders
     WHERE user_id = ? AND source = 'claim'
       AND created_at >= ${sqlStartOfDay()}`,
    [user.id]
  );
  if (Number(todayCount?.c || 0) >= maxPerDay) {
    block = true;
    blockReason = `Vượt giới hạn ${maxPerDay} đơn khai báo / ngày`;
    flags.push('rate_limit_claims');
    score += 50;
  }

  if (orderAmount > 50000000) {
    flags.push('high_amount');
    score += 20;
  }
  if (orderAmount < 10000) {
    flags.push('very_low_amount');
    score += 10;
  }

  const rejects = await one(
    `SELECT COUNT(*) as c FROM orders
     WHERE user_id = ? AND status = 'rejected'
       AND created_at >= ${sqlNowMinusDays(7)}`,
    [user.id]
  );
  if (Number(rejects?.c || 0) >= 3) {
    flags.push('recent_rejects');
    score += 30;
  }

  if (user.status === 'banned') {
    block = true;
    blockReason = 'Tài khoản đã bị khóa';
    flags.push('banned');
    score += 100;
  }

  return {
    score,
    flags,
    block,
    blockReason,
    hasRecentClick: Boolean(recentClick),
    recentClickAt: recentClick?.created_at || null,
    ip: ip || null,
  };
}
