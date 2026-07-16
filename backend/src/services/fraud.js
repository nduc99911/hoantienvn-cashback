import { db, getSetting } from '../db/schema.js';

/**
 * Chấm điểm / cờ gian lận khi user claim đơn.
 * score cao = rủi ro cao. block nếu hard-fail.
 */
export function evaluateClaimFraud(user, { orderId, orderAmount, ip }) {
  const flags = [];
  let score = 0;
  let block = false;
  let blockReason = null;

  // 1. Trùng mã đơn
  const dup = db
    .prepare('SELECT id, user_id FROM orders WHERE order_id = ?')
    .get(String(orderId).trim());
  if (dup) {
    block = true;
    blockReason =
      dup.user_id === user.id
        ? 'Bạn đã khai báo mã đơn này rồi'
        : 'Mã đơn đã tồn tại trên hệ thống';
    flags.push('duplicate_order');
    score += 100;
  }

  // 2. Click trong cửa sổ N ngày
  const windowDays = parseInt(getSetting('claim_click_window_days', '14'), 10) || 14;
  const requireClick = getSetting('require_click_before_claim', '1') === '1';
  const recentClick = db
    .prepare(
      `SELECT id, created_at FROM click_logs
       WHERE user_id = ? AND created_at >= datetime('now', ?)
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(user.id, `-${windowDays} days`);

  if (!recentClick) {
    flags.push('no_recent_click');
    score += 40;
    if (requireClick) {
      // soft block optional — cảnh báo mạnh, vẫn cho claim nếu admin muốn
      // hard: set require_click and we block
      if (getSetting('hard_block_no_click', '0') === '1') {
        block = true;
        blockReason = `Không thấy click link hoàn tiền trong ${windowDays} ngày gần đây`;
      }
    }
  }

  // 3. Số claim / ngày
  const maxPerDay = parseInt(getSetting('max_claims_per_day', '10'), 10) || 10;
  const todayCount = db
    .prepare(
      `SELECT COUNT(*) as c FROM orders
       WHERE user_id = ? AND source = 'claim'
         AND created_at >= datetime('now', 'start of day')`
    )
    .get(user.id).c;
  if (todayCount >= maxPerDay) {
    block = true;
    blockReason = `Vượt giới hạn ${maxPerDay} đơn khai báo / ngày`;
    flags.push('rate_limit_claims');
    score += 50;
  }

  // 4. Tài khoản quá mới
  const minHours = parseInt(getSetting('min_account_age_hours', '0'), 10) || 0;
  if (minHours > 0 && user.created_at) {
    const ageMs = Date.now() - new Date(user.created_at + 'Z').getTime();
    // SQLite datetime may not have Z — fallback
    const created = new Date(user.created_at.replace(' ', 'T') + 'Z');
    const hours = (Date.now() - created.getTime()) / 3600000;
    if (!Number.isNaN(hours) && hours < minHours) {
      flags.push('new_account');
      score += 25;
    }
  }

  // 5. Amount bất thường
  if (orderAmount > 50000000) {
    flags.push('high_amount');
    score += 20;
  }
  if (orderAmount < 10000) {
    flags.push('very_low_amount');
    score += 10;
  }

  // 6. Nhiều claim bị reject gần đây
  const rejects = db
    .prepare(
      `SELECT COUNT(*) as c FROM orders
       WHERE user_id = ? AND status = 'rejected'
         AND created_at >= datetime('now', '-7 days')`
    )
    .get(user.id).c;
  if (rejects >= 3) {
    flags.push('recent_rejects');
    score += 30;
  }

  // 7. User bị khóa
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
