/**
 * Backup Supabase/Postgres → JSON (+ optional .sql INSERT dump)
 *
 * Usage:
 *   DATABASE_URL=... node scripts/backup-supabase.mjs
 *   node scripts/backup-supabase.mjs --out ./backups
 *
 * Env: DATABASE_URL (pooler IPv4 recommended)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outArg = process.argv.find((a) => a.startsWith('--out='));
const outDir =
  outArg?.split('=')[1] ||
  process.env.BACKUP_DIR ||
  path.join(__dirname, '../../backups');

const TABLES = [
  'users',
  'cashback_links',
  'click_logs',
  'orders',
  'wallet_transactions',
  'withdraw_requests',
  'rate_cards',
  'settings',
  'notifications',
  'blog_posts',
  'rate_limits',
];

function escSql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === 'object') {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(outDir, `hoantienvn-${stamp}`);

  const client = new pg.Client({
    connectionString: url,
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('[backup] connected');

  const dump = {
    version: 1,
    createdAt: new Date().toISOString(),
    tables: {},
  };

  const sqlLines = [
    '-- HoanTienVN backup',
    `-- ${dump.createdAt}`,
    'BEGIN;',
  ];

  for (const table of TABLES) {
    try {
      const r = await client.query(`SELECT * FROM ${table} ORDER BY 1`);
      dump.tables[table] = r.rows;
      console.log(`[backup] ${table}: ${r.rows.length} rows`);

      if (r.rows.length) {
        const cols = Object.keys(r.rows[0]);
        for (const row of r.rows) {
          const vals = cols.map((c) => escSql(row[c])).join(', ');
          sqlLines.push(
            `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals}) ON CONFLICT DO NOTHING;`
          );
        }
      }
    } catch (e) {
      console.warn(`[backup] skip ${table}: ${e.message}`);
      dump.tables[table] = { error: e.message };
    }
  }

  sqlLines.push('COMMIT;');

  const jsonPath = `${base}.json`;
  const sqlPath = `${base}.sql`;
  fs.writeFileSync(jsonPath, JSON.stringify(dump, null, 2));
  fs.writeFileSync(sqlPath, sqlLines.join('\n') + '\n');

  // latest pointers
  fs.writeFileSync(
    path.join(outDir, 'latest.json'),
    JSON.stringify(
      { json: path.basename(jsonPath), sql: path.basename(sqlPath), at: dump.createdAt },
      null,
      2
    )
  );

  await client.end();
  console.log(`[backup] wrote ${jsonPath}`);
  console.log(`[backup] wrote ${sqlPath}`);
  console.log('[backup] done');
}

main().catch((e) => {
  console.error('[backup] fail', e.message);
  process.exit(1);
});
