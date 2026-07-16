/**
 * Tạo CSV test import Shopee Aff — map sub_id về user thật trong DB.
 * Chạy: node scripts/make-test-aff-csv.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { initDb, many } from '../src/db/schema.js';
import { generateSubId } from '../src/services/affiliate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || '',
    'Downloads',
    'AffiliateCommissionReport_202607160810.csv'
  );
const outDir = path.join(__dirname, '../data');
const outPath = path.join(outDir, 'AffiliateCommissionReport_TEST_doi_soat.csv');

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
    if (!q && c === ',') {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

await initDb();
const users = await many(
  `SELECT id, email, name, referral_code FROM users
   WHERE status IS NULL OR status = 'active'
   ORDER BY id ASC LIMIT 10`
);

if (!users.length) {
  console.error('Không có user trong DB. Đăng ký user trước.');
  process.exit(1);
}

console.log('Users map sub_id:');
const withSub = users.map((u) => {
  const sub = generateSubId(u);
  console.log(`  id=${u.id} ${u.email} → ${sub}`);
  return { ...u, sub };
});

let headerLine;
if (fs.existsSync(src)) {
  const text = fs.readFileSync(src, 'utf8').replace(/^\uFEFF/, '');
  headerLine = text.split(/\r?\n/).find((l) => l.trim());
  console.log('Header từ file gốc:', src);
} else {
  // Header chuẩn Shopee VN (rút gọn đủ cột import)
  headerLine = [
    'ID đơn hàng',
    'Trạng thái đặt hàng',
    'Checkout id',
    'Thời Gian Đặt Hàng',
    'Thời gian hoàn thành',
    'Thời gian Click',
    'Tên Shop',
    'Shop id',
    'Loại Shop',
    'Item id',
    'Tên Item',
    'ID Model',
    'Loại sản phẩm',
    'Promotion id',
    'L1 Danh mục toàn cầu',
    'L2 Danh mục toàn cầu',
    'L3 Danh mục toàn cầu',
    'Giá(₫)',
    'Số lượng',
    'Loại Hoa hồng',
    'Đối tác chiến dịch',
    'Giá trị đơn hàng (₫)',
    'Số tiền hoàn trả (₫)',
    'Tỷ lệ sản phẩm hoa hồng Shope',
    'Hoa hồng Shopee trên sản phẩm(₫)',
    'Tỷ lệ sản phẩm hoa hồng người bán',
    'Hoa hồng Xtra trên sản phẩm(₫)',
    'Tổng hoa hồng sản phẩm(₫)',
    'Hoa hồng đơn hàng từ Shopee(₫)',
    'Hoa hồng đơn hàng từ Người bán(₫)',
    'Tổng hoa hồng đơn hàng(₫)',
    'Tên MNC đã liên kết',
    'Mã hợp đồng MCN',
    'Mức phí quản lý MCN',
    'Phí quản lý MCN(₫)',
    'Mức hoa hồng tiếp thị liên kết theo thỏa thuận',
    'Hoa hồng ròng tiếp thị liên kết(₫)',
    'Trạng thái sản phẩm liên kết',
    'Ghi chú sản phẩm',
    'Loại thuộc tính',
    'Trạng thái người mua',
    'Sub_id1',
    'Sub_id2',
    'Sub_id3',
    'Sub_id4',
    'Sub_id5',
    'Kênh',
  ].join(',');
  console.log('Dùng header mặc định (không tìm thấy file gốc)');
}

const headers = parseCsvLine(headerLine);
const col = (name) => {
  const n = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '');
  const nn = n(name);
  return headers.findIndex((h) => n(h) === nn || n(h).includes(nn));
};

const iOrder = col('iddonhang') >= 0 ? col('iddonhang') : 0;
const iStatus = col('trangthaidathang') >= 0 ? col('trangthaidathang') : 1;
const iCheckout = col('checkoutid') >= 0 ? col('checkoutid') : 2;
const iPurchase = col('thoigiandathang') >= 0 ? col('thoigiandathang') : 3;
const iComplete = col('thoigianhoanthanh') >= 0 ? col('thoigianhoanthanh') : 4;
const iClick = col('thoigianclick') >= 0 ? col('thoigianclick') : 5;
const iShop = col('tenshop') >= 0 ? col('tenshop') : 6;
const iShopId = col('shopid') >= 0 ? col('shopid') : 7;
const iItemId = col('itemid') >= 0 ? col('itemid') : 9;
const iItemName = col('tenitem') >= 0 ? col('tenitem') : 10;
const iPrice = col('gia') >= 0 ? col('gia') : 17;
const iQty = col('soluong') >= 0 ? col('soluong') : 18;
const iOrderVal = col('giatridonhang') >= 0 ? col('giatridonhang') : 21;
const iNet = col('hoahongrongtiepthilienket') >= 0 ? col('hoahongrongtiepthilienket') : 36;
const iOrderComm = col('tonghoahongdonhang') >= 0 ? col('tonghoahongdonhang') : 30;
const iItemComm = col('tonghoahongsanpham') >= 0 ? col('tonghoahongsanpham') : 27;
const iProdStatus = col('trangthaisanphamlienket') >= 0 ? col('trangthaisanphamlienket') : 37;
const iNote = col('ghichusanpham') >= 0 ? col('ghichusanpham') : 38;
const iSub1 = col('subid1') >= 0 ? col('subid1') : 41;
const iChannel = col('kenh') >= 0 ? col('kenh') : 46;

function blankRow() {
  return Array(headers.length).fill('');
}

function set(row, idx, val) {
  if (idx >= 0 && idx < row.length) row[idx] = String(val);
}

const now = new Date();
const ts = (d) => {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}:${p(x.getSeconds())}`;
};

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

const rows = [];
// 3 đơn map user (lặp nếu ít user)
for (let i = 0; i < 3; i++) {
  const u = withSub[i % withSub.length];
  const p = products[i % products.length];
  const orderId = `TEST${Date.now().toString().slice(-8)}${i + 1}`;
  const row = blankRow();
  const purchase = new Date(now.getTime() - (i + 1) * 86400000);
  const click = new Date(purchase.getTime() - 3600000);

  set(row, iOrder, orderId);
  set(row, iStatus, 'Hoàn thành');
  set(row, iCheckout, `99${Date.now()}${i}`);
  set(row, iPurchase, ts(purchase));
  set(row, iComplete, ts(now));
  set(row, iClick, ts(click));
  set(row, iShop, p.shop);
  set(row, iShopId, p.shopId);
  set(row, iItemId, p.itemId);
  set(row, iItemName, p.name);
  set(row, iPrice, p.price);
  set(row, iQty, 1);
  set(row, iOrderVal, p.orderVal);
  set(row, iItemComm, p.comm);
  set(row, iOrderComm, p.comm);
  set(row, iNet, p.comm);
  set(row, iProdStatus, 'Hoàn thành');
  set(row, iNote, `TEST import doi soat - user ${u.email}`);
  set(row, iSub1, u.sub);
  set(row, iChannel, 'Affiliate');

  rows.push(row);
  console.log(`+ order ${orderId} → ${u.sub} (${u.email}) HH=${p.comm}`);
}

// 1 đơn hủy (phải skip)
{
  const u = withSub[0];
  const row = blankRow();
  set(row, iOrder, `TESTCANCEL${Date.now().toString().slice(-6)}`);
  set(row, iStatus, 'Đã hủy');
  set(row, iPurchase, ts(now));
  set(row, iItemName, 'Đơn hủy TEST — phải SKIP');
  set(row, iOrderVal, 100000);
  set(row, iNet, 0);
  set(row, iProdStatus, 'Đã hủy');
  set(row, iNote, 'Đơn hàng không hợp lệ.');
  set(row, iSub1, u.sub);
  rows.push(row);
  console.log('+ order CANCEL (skip)');
}

// 1 đơn unmapped sub
{
  const row = blankRow();
  set(row, iOrder, `TESTUNMAP${Date.now().toString().slice(-6)}`);
  set(row, iStatus, 'Hoàn thành');
  set(row, iPurchase, ts(now));
  set(row, iItemName, 'Đơn sub lạ — unmapped');
  set(row, iOrderVal, 150000);
  set(row, iNet, 15000);
  set(row, iOrderComm, 15000);
  set(row, iProdStatus, 'Hoàn thành');
  set(row, iSub1, 'U99999_NOBODY');
  rows.push(row);
  console.log('+ order UNMAPPED sub=U99999_NOBODY');
}

const body = [
  headerLine,
  ...rows.map((r) => r.map(csvEscape).join(',')),
].join('\n');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, '\uFEFF' + body, 'utf8');

// Copy to Downloads for easy find
const dl = path.join(
  process.env.USERPROFILE || '',
  'Downloads',
  'AffiliateCommissionReport_TEST_doi_soat.csv'
);
try {
  fs.writeFileSync(dl, '\uFEFF' + body, 'utf8');
  console.log('\n✅ Đã ghi:', dl);
} catch {
  /* ignore */
}
console.log('✅ Đã ghi:', outPath);
console.log('\nImport Admin → chọn file này → Preview / Import & Hold');
console.log('Kỳ vọng: 3 đơn map user · 1 skip hủy · 1 unmapped');
