import 'dotenv/config';
import { initDb, one, run, many } from '../src/db/schema.js';

await initDb();
const existing = await many('SELECT id FROM vouchers LIMIT 1');
if (existing.length) {
  console.log('Vouchers already seeded');
  process.exit(0);
}

const samples = [
  {
    code: 'SVIPD0107M200C350',
    title: 'Giảm 20% đơn từ 200K — tối đa 350K',
    discount_label: 'ƯU ĐÃI 20%',
    min_order: 200000,
    max_discount: 350000,
    used_percent: 10,
  },
  {
    code: 'SVIPD0107M700C700',
    title: 'Giảm 18% đơn từ 700K — tối đa 700K',
    discount_label: 'ƯU ĐÃI 18%',
    min_order: 700000,
    max_discount: 700000,
    used_percent: 10,
  },
  {
    code: 'SVIPD0107M350C350',
    title: 'Giảm 18% đơn từ 350K — tối đa 350K',
    discount_label: 'ƯU ĐÃI 18%',
    min_order: 350000,
    max_discount: 350000,
    used_percent: 15,
  },
];

for (const [i, s] of samples.entries()) {
  await run(
    `INSERT INTO vouchers
     (platform, code, title, discount_label, min_order, max_discount, used_percent, sort_order, active)
     VALUES ('shopee', ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      s.code,
      s.title,
      s.discount_label,
      s.min_order,
      s.max_discount,
      s.used_percent,
      i,
    ]
  );
}
console.log('Seeded', samples.length, 'vouchers');
process.exit(0);
