import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

console.log('Connecting...', url.replace(/:[^:@/]+@/, ':***@'));
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('Connected OK');

const sqlPath = path.join(__dirname, '../src/db/schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');
await client.query(sql);
console.log('Schema applied OK');

const r = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`
);
console.log('Tables:', r.rows.map((x) => x.tablename).join(', '));
await client.end();
