import fs from 'fs';

const files = [
  'src/routes/auth.js',
  'src/routes/links.js',
  'src/routes/claims.js',
  'src/routes/wallet.js',
  'src/routes/blog.js',
  'src/routes/public.js',
  'src/routes/notifications.js',
  'src/routes/telegram.js',
  'src/routes/zalo.js',
  'src/routes/admin.js',
  'src/services/importOrders.js',
  'src/services/telegramBot.js',
  'src/services/zaloBot.js',
  'src/services/product.js',
  'src/index.js',
];

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log('missing', f);
    continue;
  }
  let s = fs.readFileSync(f, 'utf8');
  const orig = s;

  // Normalize imports that include db
  s = s.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"](\.\.\/db\/schema\.js|\.\/db\/schema\.js)['"]/g,
    (m, names, p) => {
      let parts = names
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x && x !== 'db');
      if (orig.includes('db.prepare') || orig.includes('db.transaction')) {
        for (const need of ['one', 'many', 'run']) {
          if (!parts.includes(need)) parts.push(need);
        }
      }
      if (orig.includes('withTransaction') || orig.includes('db.transaction')) {
        if (!parts.includes('withTransaction')) parts.push('withTransaction');
      }
      if (orig.includes('sqlNow') || /datetime\('now'/.test(orig)) {
        if (!parts.includes('sqlNow')) parts.push('sqlNow');
      }
      return `import { ${parts.join(', ')} } from '${p}'`;
    }
  );

  s = s.replace(
    /import\s*\{\s*db\s*\}\s*from\s*['"](\.\.\/db\/schema\.js|\.\/db\/schema\.js)['"]/g,
    "import { one, many, run } from '$1'"
  );

  // db.prepare('sql').get(a,b) 
  s = s.replace(
    /db\.prepare\(\s*(['"`])([\s\S]*?)\1\s*\)\.get\(([^)]*)\)/g,
    (m, q, sql, args) => {
      const a = args.trim();
      if (!a) return `await one(${q}${sql}${q})`;
      // if already array
      if (a.startsWith('[')) return `await one(${q}${sql}${q}, ${a})`;
      return `await one(${q}${sql}${q}, [${a}])`;
    }
  );
  s = s.replace(
    /db\.prepare\(\s*(['"`])([\s\S]*?)\1\s*\)\.all\(([^)]*)\)/g,
    (m, q, sql, args) => {
      const a = args.trim();
      if (!a) return `await many(${q}${sql}${q})`;
      if (a.startsWith('[')) return `await many(${q}${sql}${q}, ${a})`;
      return `await many(${q}${sql}${q}, [${a}])`;
    }
  );
  s = s.replace(
    /db\.prepare\(\s*(['"`])([\s\S]*?)\1\s*\)\.run\(([^)]*)\)/g,
    (m, q, sql, args) => {
      const a = args.trim();
      if (!a) return `await run(${q}${sql}${q})`;
      if (a.startsWith('[')) return `await run(${q}${sql}${q}, ${a})`;
      return `await run(${q}${sql}${q}, [${a}])`;
    }
  );

  if (s !== orig) {
    fs.writeFileSync(f, s);
    console.log('patched', f);
  } else {
    console.log('no change', f);
  }
}
