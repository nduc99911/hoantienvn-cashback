import fs from 'fs';

const path =
  process.argv[2] ||
  'C:/Users/nduc9/Downloads/AffiliateCommissionReport_202607160810.csv';

const text = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
const lines = text.split(/\r?\n/).filter(Boolean);
console.log('lines', lines.length);

function parseLine(line) {
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

const cols = parseLine(lines[0]);
console.log('\n=== COLUMNS ===');
cols.forEach((c, i) => console.log(String(i).padStart(2), c));

const r1 = parseLine(lines[1]);
console.log('\n=== ROW 1 ===');
cols.forEach((c, i) => {
  if (r1[i] !== undefined && r1[i] !== '') console.log(c, '=', r1[i]);
});

const statusCount = {};
const sub1Count = {};
const channelCount = {};
const productStatusCount = {};

const idx = {
  order: cols.findIndex((c) => /ID đơn hàng|ID don hang/i.test(c) || c.includes('ID đơn')),
  orderStatus: cols.findIndex((c) => /Trạng thái đặt|Trang thai dat/i.test(c) || c.includes('đặt hàng')),
  sub1: cols.findIndex((c) => /Sub_id1/i.test(c)),
  sub2: cols.findIndex((c) => /Sub_id2/i.test(c)),
  netComm: cols.findIndex((c) => /Hoa hồng ròng|Hoa hong rong/i.test(c)),
  totalOrderComm: cols.findIndex((c) => /Tổng hoa hồng đơn hàng/i.test(c) || c.includes('Tổng hoa hồng đơn')),
  orderValue: cols.findIndex((c) => /Giá trị đơn hàng/i.test(c) || c.includes('Giá trị đơn')),
  itemName: cols.findIndex((c) => /Tên Item|Ten Item/i.test(c)),
  productStatus: cols.findIndex((c) => /Trạng thái sản phẩm liên kết|san pham lien ket/i.test(c)),
  channel: cols.findIndex((c) => c === 'Kênh' || c === 'Kenh'),
  purchaseTime: cols.findIndex((c) => /Thời Gian Đặt|Thoi Gian Dat/i.test(c)),
};

// fallback by known positions from Shopee VN export
if (idx.order < 0) idx.order = 0;
if (idx.orderStatus < 0) idx.orderStatus = 1;
if (idx.sub1 < 0) idx.sub1 = cols.findIndex((c) => c.toLowerCase().includes('sub_id1'));
if (idx.sub2 < 0) idx.sub2 = cols.findIndex((c) => c.toLowerCase().includes('sub_id2'));

console.log('\n=== INDEX MAP ===', idx);

for (let i = 1; i < lines.length; i++) {
  const p = parseLine(lines[i]);
  const st = p[idx.orderStatus] || '?';
  statusCount[st] = (statusCount[st] || 0) + 1;
  const s1 = p[idx.sub1] || '(empty)';
  sub1Count[s1] = (sub1Count[s1] || 0) + 1;
  const ch = p[idx.channel] || '(empty)';
  channelCount[ch] = (channelCount[ch] || 0) + 1;
  const ps = p[idx.productStatus] || '?';
  productStatusCount[ps] = (productStatusCount[ps] || 0) + 1;
}

console.log('\n=== Order status ===');
console.log(statusCount);
console.log('\n=== Product link status ===');
console.log(productStatusCount);
console.log('\n=== Sub_id1 ===');
console.log(
  Object.entries(sub1Count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
);
console.log('\n=== Channel ===');
console.log(channelCount);

// sample non-cancelled
console.log('\n=== Sample non-cancelled (up to 8) ===');
let n = 0;
for (let i = 1; i < lines.length && n < 8; i++) {
  const p = parseLine(lines[i]);
  const st = p[idx.orderStatus] || '';
  if (/hủy|huy|cancel/i.test(st)) continue;
  console.log({
    order: p[idx.order],
    status: st,
    productStatus: p[idx.productStatus],
    value: p[idx.orderValue],
    netComm: p[idx.netComm],
    totalOrderComm: p[idx.totalOrderComm],
    sub1: p[idx.sub1],
    sub2: p[idx.sub2],
    item: (p[idx.itemName] || '').slice(0, 60),
    channel: p[idx.channel],
  });
  n++;
}
