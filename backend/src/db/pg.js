/**
 * PostgreSQL (Supabase) pool + helpers
 * Connection: DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-....supabase.co:5432/postgres
 */
import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL chưa cấu hình (Supabase connection string)');
    pool = new Pool({
      connectionString: url,
      ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

/** ? → $1, $2 ... (không đụng ? trong string) */
export function toPgParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function query(sql, params = []) {
  const text = toPgParams(sql);
  return getPool().query(text, params);
}

export async function one(sql, params = []) {
  const r = await query(sql, params);
  return r.rows[0] || null;
}

export async function many(sql, params = []) {
  const r = await query(sql, params);
  return r.rows;
}

/**
 * run INSERT/UPDATE/DELETE
 * Với INSERT ... RETURNING id → lastInsertRowid
 */
export async function run(sql, params = []) {
  let text = sql.trim();
  const isInsert = /^insert\s+/i.test(text);
  // Chỉ RETURNING id khi INSERT thường (có cột serial id). Bỏ qua UPSERT / bảng key-value.
  const canReturnId =
    isInsert &&
    !/returning\s+/i.test(text) &&
    !/on\s+conflict/i.test(text) &&
    !/insert\s+into\s+settings\b/i.test(text) &&
    !/insert\s+into\s+rate_limits\b/i.test(text);
  if (canReturnId) {
    text = text.replace(/;?\s*$/, '') + ' RETURNING id';
  }
  const r = await query(text, params);
  return {
    changes: r.rowCount || 0,
    lastInsertRowid: r.rows[0]?.id ?? null,
    rows: r.rows,
  };
}

export async function withTransaction(fn) {
  const client = await getPool().connect();
  const tx = {
    async query(sql, params = []) {
      return client.query(toPgParams(sql), params);
    },
    async one(sql, params = []) {
      const r = await client.query(toPgParams(sql), params);
      return r.rows[0] || null;
    },
    async many(sql, params = []) {
      const r = await client.query(toPgParams(sql), params);
      return r.rows;
    },
    async run(sql, params = []) {
      let text = sql.trim();
      const canReturnId =
        /^insert\s+/i.test(text) &&
        !/returning\s+/i.test(text) &&
        !/on\s+conflict/i.test(text) &&
        !/insert\s+into\s+settings\b/i.test(text) &&
        !/insert\s+into\s+rate_limits\b/i.test(text);
      if (canReturnId) {
        text = text.replace(/;?\s*$/, '') + ' RETURNING id';
      }
      const r = await client.query(toPgParams(text), params);
      return {
        changes: r.rowCount || 0,
        lastInsertRowid: r.rows[0]?.id ?? null,
        rows: r.rows,
      };
    },
  };
  try {
    await client.query('BEGIN');
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
