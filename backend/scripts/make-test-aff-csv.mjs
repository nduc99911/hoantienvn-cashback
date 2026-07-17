/**
 * Tạo CSV test import Shopee Aff — header chuẩn, cột khớp importOrders.
 * node scripts/make-test-aff-csv.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { initDb, many } from '../src/db/schema.js';
import { generateSubId } from '../src/services/affiliate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outName = 'AffiliateCommissionReport_TEST_doi_soat.csv';
const outPaths = [
  path.join(__dirname, '../data', outName),
  path.join(process.env.USERPROFILE || '', 'Downloads', outName),
];

// Header tối giản — đủ để isShopeeReport + detectShopeeColumns
const HEADERS = [
  'ID đơn hàng',
  'Trạng thái đặt hàng',
  'Checkout id',
  'Thời Gian Đặt Hàng',
  'Thời gian hoàn thành',
  'Thời gian Click',
  'Tên Shop',
  'Shop id',
  'Item id',
  'Tên Item',
  'Giá(₫)',
  'Số lượng',
  'Giá trị đơn hàng (₫)',
  'Tổng hoa hồng sản phẩm(₫)',
  'Tổng hoa hồng đơn hàng(₫)',
  'Hoa hồng ròng tiếp thị liên kết(₫)',
  'Trạng thái sản phẩm liên kết',
  'Ghi chú sản phẩm',
  'Sub_id1',
  'Sub_id2',
  'Sub_id3',
  'Sub_id4',
  'Sub_id5',
  'Kênh',
];

function esc(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function ts(d) {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}:${p(x.getSeconds())}`;
}

await initDb();
const users = await many(
  `SELECT id, email, name, referral_code FROM users
   WHERE status IS NULL OR status = 'active'
   ORDER BY id ASC LIMIT 10`
);
if (!users.length) {
  console.error('Không có user');
  process.exit(1);
}

const withSub = users.map((u) => ({ ...u, sub: generateSubId(u) }));
console.log('Users:');
withSub.forEach((u) => console.log(`  ${u.email} → ${u.sub}`));

const now = Date.now();
const products = [
  {
    name: 'Tai nghe Bluetooth TEST HoanTien',
    shop: 'HoanTien Test Shop',
    shopId: '684726466',
    itemId: '23922474647',
    price: 250000,
    orderVal: 250000,
    comm: 35000,
  },
  {
    name: 'Sạc nhanh 20W TEST',
    shop: 'Tech Test Store',
    shopId: '18866536',
    itemId: '28323256581',
    price: 99000,
    orderVal: 99000,
    comm: 12000,
  },
  {
    name: 'Ốp lưng iPhone TEST',
    shop: 'Case Shop',
    shopId: '100200300',
    itemId: '400500600',
    price: 79000,
    orderVal: 79000,
    comm: 8000,
  },
];

const dataRows = [];

for (let i = 0; i < 3; i++) {
  const u = withSub[i % withSub.length];
  const p = products[i];
  const orderId = `TEST${String(now).slice(-8)}${i + 1}`;
  const purchase = new Date(now - (i + 1) * 86400000);
  const click = new Date(purchase.getTime() - 3600000);
  const complete = new Date(now - i * 3600000);

  // đúng thứ tự HEADERS
  const row = [
    orderId, // ID đơn hàng
    'Hoàn thành', // Trạng thái đặt hàng
    `CK${now}${i}`, // Checkout id
    ts(purchase), // Thời Gian Đặt Hàng
    ts(complete), // Thời gian hoàn thành
    ts(click), // Thời gian Click
    p.shop, // Tên Shop
    p.shopId, // Shop id
    p.itemId, // Item id
    p.name, // Tên Item
    p.price, // Giá
    1, // Số lượng
    p.orderVal, // Giá trị đơn hàng
    p.comm, // Tổng hoa hồng sản phẩm
    p.comm, // Tổng hoa hồng đơn hàng
    p.comm, // Hoa hồng ròng
    'Hoàn thành', // Trạng thái SP liên kết
    `TEST doi soat - ${u.email}`, // Ghi chú
    u.sub, // Sub_id1
    '',
    '',
    '',
    '',
    'Affiliate', // Kênh
  ];
  dataRows.push(row);
  console.log(`+ ${orderId} → ${u.sub} HH=${p.comm}`);
}

// đơn hủy
dataRows.push([
  `TESTCANCEL${String(now).slice(-6)}`,
  'Đã hủy',
  `CKC${now}`,
  ts(now),
  '--',
  ts(now),
  'Shop Hủy',
  '1',
  '2',
  'Đơn hủy TEST — phải SKIP',
  100000,
  1,
  100000,
  0,
  0,
  0,
  'Đã hủy',
  'Đơn hàng không hợp lệ.',
  withSub[0].sub,
  '',
  '',
  '',
  '',
  'Affiliate',
]);
console.log('+ CANCEL (skip)');

// unmapped
dataRows.push([
  `TESTUNMAP${String(now).slice(-6)}`,
  'Hoàn thành',
  `CKU${now}`,
  ts(now),
  ts(now),
  ts(now),
  'Shop Lạ',
  '9',
  '9',
  'Đơn sub lạ — unmapped',
  150000,
  1,
  150000,
  15000,
  15000,
  15000,
  'Hoàn thành',
  'sub không tồn tại',
  'U99999_NOBODY',
  '',
  '',
  '',
  '',
  'Affiliate',
]);
console.log('+ UNMAPPED');

const csv =
  '\uFEFF' +
  [HEADERS.map(esc).join(','), ...dataRows.map((r) => r.map(esc).join(','))].join(
    '\n'
  );

for (const p of outPaths) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, csv, 'utf8');
    console.log('✅', p);
  } catch (e) {
    console.warn('skip', p, e.message);
  }
}

console.log('\nKỳ vọng import: 3 OK · 1 skip hủy · 1 unmapped fail');
console.log('Chạy import: node scripts/import-test-csv.mjs');
