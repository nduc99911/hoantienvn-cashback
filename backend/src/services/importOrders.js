/**
 * Import báo cáo Shopee Affiliate (AffiliateCommissionReport_*.csv)
 * + CSV đơn giản orderId,amount,commission,subId
 *
 * Map: Sub_id1 (hoặc sub_id1..5) → user → hold tự động
 * Gộp nhiều dòng item cùng ID đơn hàng
 */
import fs from 'fs';
import { db, getSetting } from '../db/schema.js';
import { recordPendingOrder, approveOrderToHold } from './wallet.js';
import { estimateCommissionRate } from './product.js';
import { parseSubId, reconcileKey } from './affiliate.js';
import { createNotification } from './notifications.js';

// --- CSV parse ---
function parseCsvLine(line) {
  const parts = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (!q && (c === ',' || c === '\t' || c === ';')) {
      parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  parts.push(cur.trim());
  return parts;
}

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '');
}

function normHeader(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ''); // bỏ cả _ khoảng trắng
}

function parseMoney(v) {
  if (v == null || v === '' || v === '--') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Nhận diện header Shopee VN commission report
 */
function detectShopeeColumns(headers) {
  const n = headers.map(normHeader);

  /** Ưu tiên khớp exact, rồi header dài chứa chứa needle (tránh "gia" khớp "giatridonhang") */
  const find = (...needles) => {
    for (const needle of needles) {
      const nn = normHeader(needle);
      let i = n.findIndex((h) => h === nn);
      if (i >= 0) return i;
    }
    for (const needle of needles) {
      const nn = normHeader(needle);
      // header chứa full needle hoặc needle là prefix đủ dài
      let i = n.findIndex((h) => h.startsWith(nn) || (nn.length >= 8 && h.includes(nn)));
      if (i >= 0) return i;
      i = n.findIndex((h) => nn.length >= 8 && nn.includes(h) && h.length >= 8);
      if (i >= 0) return i;
    }
    return -1;
  };

  return {
    orderId: find('iddonhang', 'orderid'),
    orderStatus: find('trangthaidathang', 'orderstatus'),
    checkoutId: find('checkoutid'),
    purchaseTime: find('thoigiandathang', 'purchasetime'),
    completeTime: find('thoigianhoanthanh'),
    clickTime: find('thoigianclick'),
    shopName: find('tenshop'),
    shopId: find('shopid'),
    itemId: find('itemid'),
    itemName: find('tenitem', 'productname', 'itemname'),
    price: find('gia'), // "Giá(₫)" exact-ish
    qty: find('soluong'),
    // Quan trọng: phải match "Giá trị đơn hàng" trước "Giá"
    orderValue: find('giatridonhang', 'orderamount'),
    itemTotalComm: find('tonghoahongsanpham'),
    orderTotalComm: find('tonghoahongdonhang'),
    netComm: find(
      'hoahongrongtiepthilienket',
      'hoahongrong',
      'netcommission'
    ),
    productStatus: find('trangthaisanphamlienket'),
    note: find('ghichusanpham'),
    sub1: find('subid1'),
    sub2: find('subid2'),
    sub3: find('subid3'),
    sub4: find('subid4'),
    sub5: find('subid5'),
    channel: find('kenh'),
  };
}

function isShopeeReport(headers) {
  const joined = headers.map(normHeader).join('|');
  return (
    joined.includes('iddonhang') ||
    joined.includes('subid1') ||
    joined.includes('hoahongrong') ||
    joined.includes('checkoutid')
  );
}

function pickSubId(row, col) {
  for (const k of ['sub1', 'sub2', 'sub3', 'sub4', 'sub5']) {
    const i = col[k];
    if (i >= 0 && row[i]) return String(row[i]).trim().replace(/\/$/, '');
  }
  return '';
}

function isCancelled(status) {
  return /huy|hủy|cancel|invalid|khong hop le|không hợp lệ/i.test(
    String(status || '')
  );
}

function isCompleted(status) {
  return /hoan thanh|hoàn thành|completed|complete|da giao|đã giao/i.test(
    String(status || '')
  );
}

/**
 * Parse text CSV → mảng đơn đã gộp theo orderId
 * @returns {{ rows: Array, meta: object }}
 */
export function parseExportText(text) {
  const raw = stripBom(text);
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], meta: { format: 'empty' } };

  const headers = parseCsvLine(lines[0]);
  const shopee = isShopeeReport(headers);

  if (shopee) {
    return parseShopeeCommission(lines, headers);
  }
  return { rows: parseSimpleCsv(lines, headers), meta: { format: 'simple' } };
}

function parseShopeeCommission(lines, headers) {
  const col = detectShopeeColumns(headers);
  const byOrder = new Map();
  let skippedCancel = 0;
  let lineItems = 0;

  for (let i = 1; i < lines.length; i++) {
    const p = parseCsvLine(lines[i]);
    if (!p.length || !p[col.orderId]) continue;
    lineItems++;

    const orderId = String(p[col.orderId]).trim();
    const orderStatus = col.orderStatus >= 0 ? p[col.orderStatus] : '';
    const productStatus = col.productStatus >= 0 ? p[col.productStatus] : '';

    // Bỏ dòng đã hủy
    if (isCancelled(orderStatus) || isCancelled(productStatus)) {
      skippedCancel++;
      continue;
    }

    const amount = parseMoney(col.orderValue >= 0 ? p[col.orderValue] : 0);
    // Ưu tiên hoa hồng ròng; fallback tổng HH đơn
    let commission = parseMoney(col.netComm >= 0 ? p[col.netComm] : 0);
    if (!commission) {
      commission = parseMoney(col.orderTotalComm >= 0 ? p[col.orderTotalComm] : 0);
    }
    if (!commission) {
      commission = parseMoney(col.itemTotalComm >= 0 ? p[col.itemTotalComm] : 0);
    }

    const subId = pickSubId(p, col);
    const productName = col.itemName >= 0 ? p[col.itemName] : '';
    const purchaseTime = col.purchaseTime >= 0 ? p[col.purchaseTime] : '';
    const channel = col.channel >= 0 ? p[col.channel] : '';
    const itemId = col.itemId >= 0 ? p[col.itemId] : '';

    if (!byOrder.has(orderId)) {
      byOrder.set(orderId, {
        orderId,
        amount: 0,
        commission: 0,
        subId,
        productName,
        purchaseTime,
        status: orderStatus || productStatus || 'Hoàn thành',
        channel,
        itemIds: [],
        lineCount: 0,
      });
    }
    const o = byOrder.get(orderId);
    o.amount += amount;
    o.commission += commission;
    o.lineCount += 1;
    if (itemId) o.itemIds.push(itemId);
    if (!o.subId && subId) o.subId = subId;
    if (productName && o.lineCount === 1) o.productName = productName;
    else if (productName && o.lineCount > 1 && !o.productName.includes(productName.slice(0, 20))) {
      o.productName = `${o.productName} (+${o.lineCount - 1} SP)`;
    }
  }

  const rows = [...byOrder.values()].filter((r) => r.orderId);
  return {
    rows,
    meta: {
      format: 'shopee_commission_vn',
      lineItems,
      orders: rows.length,
      skippedCancel,
      columns: col,
    },
  };
}

function parseSimpleCsv(lines, headers) {
  const looksHeader = headers.some((c) =>
    /order|sub|commission|amount|đơn|hoa/i.test(c)
  );
  let colMap = {};
  let start = 0;
  if (looksHeader) {
    const n = headers.map(normHeader);
    const mapField = (names, field) => {
      for (const name of names) {
        const i = n.findIndex((h) => h.includes(normHeader(name)));
        if (i >= 0) colMap[field] = i;
      }
    };
    mapField(['orderid', 'iddonhang', 'ma don'], 'orderId');
    mapField(['amount', 'giatri', 'orderamount'], 'amount');
    mapField(['commission', 'hoahong'], 'commission');
    mapField(['subid', 'sub_id', 'subid1'], 'subId');
    mapField(['email'], 'email');
    mapField(['productname', 'tenitem'], 'productName');
    start = 1;
  } else {
    colMap = { orderId: 0, amount: 1, commission: 2, subId: 3 };
  }

  const rows = [];
  for (let i = start; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    const get = (f) => (colMap[f] != null ? parts[colMap[f]] : undefined);
    const orderId = get('orderId');
    const amount = parseMoney(get('amount'));
    if (!orderId) continue;
    rows.push({
      orderId: String(orderId).trim(),
      amount,
      commission: parseMoney(get('commission')),
      subId: (get('subId') || '').toString().trim().replace(/\/$/, ''),
      email: (get('email') || '').toString().trim(),
      productName: get('productName') || '',
      status: 'Hoàn thành',
      lineCount: 1,
    });
  }
  return rows;
}

/**
 * Map sub_id → user
 * Hỗ trợ: U2_DEMO2026 | DEMO2026 | dangbeo (link.sub_id exact)
 */
export function resolveUserFromSubId(row) {
  if (row.email) {
    const u = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(String(row.email).toLowerCase());
    if (u) return { user: u, via: 'email' };
  }

  if (row.subId) {
    const sub = String(row.subId).trim().replace(/\/$/, '');
    const parsed = parseSubId(sub);

    if (parsed.userId) {
      const u = db.prepare('SELECT * FROM users WHERE id = ?').get(parsed.userId);
      if (u) return { user: u, via: 'sub_uid', subId: sub };
    }

    if (parsed.referralCode) {
      const u = db
        .prepare('SELECT * FROM users WHERE referral_code = ?')
        .get(parsed.referralCode);
      if (u) return { user: u, via: 'sub_referral', subId: sub };
    }

    // exact match any link sub_id
    const link = db
      .prepare(
        `SELECT * FROM cashback_links WHERE sub_id = ? ORDER BY id DESC LIMIT 1`
      )
      .get(sub);
    if (link) {
      const u = db.prepare('SELECT * FROM users WHERE id = ?').get(link.user_id);
      if (u) return { user: u, via: 'link_sub', subId: sub, linkId: link.id };
    }

    // case-insensitive referral
    const ref = db
      .prepare(
        `SELECT * FROM users WHERE upper(referral_code) = upper(?) LIMIT 1`
      )
      .get(sub);
    if (ref) return { user: ref, via: 'referral_ci', subId: sub };

    const m = sub.match(/U(\d+)/i);
    if (m) {
      const u = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(m[1]));
      if (u) return { user: u, via: 'sub_partial', subId: sub };
    }
  }

  return { user: null };
}

/**
 * @param {Array|string} input - rows array hoặc CSV text
 * @param {{ autoHold?: boolean, onlyCompleted?: boolean, minCommission?: number }} options
 */
export function importAffiliateRows(input, options = {}) {
  const autoHold = options.autoHold !== false;
  const onlyCompleted = options.onlyCompleted !== false;
  const minCommission = options.minCommission ?? 0;
  const shareRatio = parseFloat(getSetting('cashback_share_ratio', '0.70'));

  let rows;
  let meta = {};
  if (typeof input === 'string') {
    const parsed = parseExportText(input);
    rows = parsed.rows;
    meta = parsed.meta || {};
  } else if (Array.isArray(input)) {
    rows = input;
    meta = { format: 'array' };
  } else {
    return { imported: 0, failed: 0, results: [], meta: { error: 'invalid input' } };
  }

  const results = [];

  for (const row of rows) {
    try {
      if (onlyCompleted && row.status && isCancelled(row.status)) {
        results.push({
          orderId: row.orderId,
          ok: false,
          error: 'Bỏ qua đơn hủy',
          skipped: true,
        });
        continue;
      }
      if (
        onlyCompleted &&
        row.status &&
        !isCompleted(row.status) &&
        !isCancelled(row.status)
      ) {
        // pending / khác — vẫn import nếu có commission
        if (!(row.commission > 0 || row.amount > 0)) {
          results.push({
            orderId: row.orderId,
            ok: false,
            error: `Trạng thái: ${row.status}`,
            skipped: true,
          });
          continue;
        }
      }

      const exists = db
        .prepare('SELECT id, status FROM orders WHERE order_id = ?')
        .get(String(row.orderId));
      if (exists) {
        results.push({
          orderId: row.orderId,
          ok: false,
          error: 'Trùng mã đơn',
          existingId: exists.id,
          reconcileKey: reconcileKey(row.subId, row.orderId),
        });
        continue;
      }

      const resolved = resolveUserFromSubId(row);
      if (!resolved.user) {
        results.push({
          orderId: row.orderId,
          ok: false,
          error: `Không map user từ Sub_id="${row.subId || ''}"`,
          reconcileKey: reconcileKey(row.subId, row.orderId),
          subId: row.subId,
          amount: row.amount,
          commission: row.commission,
        });
        continue;
      }

      const user = resolved.user;
      let commission = Number(row.commission) || 0;
      if (!commission && row.amount > 0) {
        const rate = estimateCommissionRate(row.productName || '', 'shopee').rate;
        commission = Math.round(row.amount * rate);
      }
      if (commission < minCommission && commission > 0) {
        // vẫn import nhưng cảnh báo
      }
      if (commission <= 0 && (row.amount || 0) <= 0) {
        results.push({
          orderId: row.orderId,
          ok: false,
          error: 'Hoa hồng/giá trị = 0 (bỏ qua)',
          skipped: true,
          subId: row.subId,
        });
        continue;
      }

      const cashback = Math.round(commission * shareRatio);

      let linkId = resolved.linkId || null;
      if (!linkId && row.subId) {
        const link = db
          .prepare(
            `SELECT id FROM cashback_links WHERE sub_id = ? AND user_id = ? LIMIT 1`
          )
          .get(row.subId, user.id);
        if (link) linkId = link.id;
      }

      const order = recordPendingOrder({
        userId: user.id,
        linkId,
        orderId: row.orderId,
        productName:
          row.productName ||
          `Shopee #${row.orderId} (${reconcileKey(row.subId, row.orderId)})`,
        orderAmount: row.amount || 0,
        totalCommission: commission,
        cashbackAmount: cashback,
        purchaseTime: row.purchaseTime || new Date().toISOString(),
        source: 'import',
        status: 'pending',
        platform: 'shopee',
        claimNote: `Shopee CSV · sub=${row.subId || '—'} · via ${resolved.via} · lines=${row.lineCount || 1}`,
      });

      if (autoHold) {
        approveOrderToHold(
          order.id,
          `Import Shopee · ${reconcileKey(row.subId, row.orderId)}`
        );
      }

      createNotification({
        userId: user.id,
        type: 'order_auto',
        title: 'Đơn Shopee ghi nhận tự động',
        body: `Đơn #${row.orderId} · hoàn ~${cashback.toLocaleString('vi-VN')}đ`,
        meta: { orderId: order.id, subId: row.subId },
      });

      results.push({
        orderId: row.orderId,
        ok: true,
        userId: user.id,
        userName: user.name,
        subId: row.subId,
        reconcileKey: reconcileKey(row.subId, row.orderId),
        amount: row.amount,
        commission,
        cashback,
        id: order.id,
        held: autoHold,
        via: resolved.via,
        lineCount: row.lineCount || 1,
      });
    } catch (e) {
      results.push({
        orderId: row.orderId,
        ok: false,
        error: e.message,
        reconcileKey: reconcileKey(row.subId, row.orderId),
      });
    }
  }

  return {
    imported: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    results,
    meta,
  };
}

/** Đọc file từ disk */
export function importFromFile(filePath, options = {}) {
  const text = fs.readFileSync(filePath, 'utf8');
  return importAffiliateRows(text, options);
}

/** Preview không ghi DB */
export function previewExportText(text) {
  const parsed = parseExportText(text);
  const sample = (parsed.rows || []).slice(0, 20).map((r) => {
    const resolved = resolveUserFromSubId(r);
    return {
      orderId: r.orderId,
      amount: r.amount,
      commission: r.commission,
      subId: r.subId,
      status: r.status,
      productName: (r.productName || '').slice(0, 80),
      lineCount: r.lineCount || 1,
      mappedUser: resolved.user
        ? { id: resolved.user.id, name: resolved.user.name, via: resolved.via }
        : null,
    };
  });
  return {
    meta: parsed.meta,
    totalOrders: parsed.rows?.length || 0,
    mapped: sample.filter((s) => s.mappedUser).length,
    unmapped: sample.filter((s) => !s.mappedUser).length,
    sample,
  };
}
