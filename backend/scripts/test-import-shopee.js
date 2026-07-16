import fs from 'fs';
import { initDb, db } from '../src/db/schema.js';
import {
  previewExportText,
  importAffiliateRows,
} from '../src/services/importOrders.js';

initDb();

const csvPath =
  process.argv[2] ||
  'C:/Users/nduc9/Downloads/AffiliateCommissionReport_202607160810.csv';

const csv = fs.readFileSync(csvPath, 'utf8');
const p = previewExportText(csv);
console.log('=== PREVIEW ===');
console.log(p.meta);
console.log('totalOrders', p.totalOrders, 'sample mapped', p.mapped, 'unmapped', p.unmapped);
console.log(p.sample.slice(0, 6));

// Map sub_id "dangbeo" → demo user for test
const demo = db
  .prepare("SELECT * FROM users WHERE email = ?")
  .get('demo@hoantien.vn');
if (demo) {
  const exists = db
    .prepare("SELECT id FROM cashback_links WHERE sub_id = ?")
    .get('dangbeo');
  if (!exists) {
    db.prepare(
      `INSERT INTO cashback_links
       (user_id, original_url, affiliate_url, short_code, product_name, sub_id, platform)
       VALUES (?, 'https://shopee.vn', 'https://shopee.vn', 'mapdangbeo', 'channel dangbeo', 'dangbeo', 'shopee')`
    ).run(demo.id);
    console.log('Mapped sub_id dangbeo → demo user', demo.id);
  }
}

const r = importAffiliateRows(csv, { autoHold: true });
console.log('=== IMPORT ===');
console.log({
  imported: r.imported,
  failed: r.failed,
  skipped: r.skipped,
  meta: r.meta,
});
console.log('OK', r.results.filter((x) => x.ok).slice(0, 8));
console.log(
  'UNMAPPED',
  r.results.filter((x) => !x.ok && /map/i.test(x.error || '')).slice(0, 5)
);
