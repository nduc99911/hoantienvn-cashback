import fs from 'fs';
import { globSync } from 'fs'; // not available
import path from 'path';

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.js')) acc.push(p);
  }
  return acc;
}

const files = walk('src').filter(
  (f) => !f.includes('schema.js') && !f.includes('pg.js')
);

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const orig = s;

  // leftover db.prepare with template literals spanning lines
  s = s.replace(
    /db\.prepare\(\s*`([\s\S]*?)`\s*\)\s*\.run\(([\s\S]*?)\)/g,
    (m, sql, args) => {
      const a = args.trim().replace(/\s+/g, ' ');
      if (!a) return `await run(\`${sql}\`)`;
      if (a.startsWith('[')) return `await run(\`${sql}\`, ${a})`;
      // multi-arg
      return `await run(\`${sql}\`, [${a}])`;
    }
  );
  s = s.replace(
    /db\.prepare\(\s*`([\s\S]*?)`\s*\)\s*\.get\(([\s\S]*?)\)/g,
    (m, sql, args) => {
      const a = args.trim();
      if (!a) return `await one(\`${sql}\`)`;
      if (a.startsWith('[')) return `await one(\`${sql}\`, ${a})`;
      return `await one(\`${sql}\`, [${a}])`;
    }
  );
  s = s.replace(
    /db\.prepare\(\s*`([\s\S]*?)`\s*\)\s*\.all\(([\s\S]*?)\)/g,
    (m, sql, args) => {
      const a = args.trim();
      if (!a) return `await many(\`${sql}\`)`;
      if (a.startsWith('[')) return `await many(\`${sql}\`, ${a})`;
      return `await many(\`${sql}\`, [${a}])`;
    }
  );

  // broken: await run('sql', [status, req.params.id]); style already ok
  // fix: db.prepare('x', [a]) wrong codemod
  s = s.replace(
    /db\.prepare\(\s*'([^']+)'\s*,\s*(\[[^\]]+\])\s*\)/g,
    'await run(\'$1\', $2)'
  );

  // db.transaction
  s = s.replace(
    /const run = db\.transaction\(\(\) => \{/g,
    'await withTransaction(async (tx) => {'
  );
  s = s.replace(/db\.transaction\(\(\) => \{/g, 'await withTransaction(async (tx) => {');

  // ensure imports have withTransaction if used
  if (s.includes('withTransaction') && s.includes("from '../db/schema.js'")) {
    if (!s.includes('withTransaction')) {
      /* already */
    }
    s = s.replace(
      /import \{([^}]+)\} from '\.\.\/db\/schema\.js'/,
      (m, names) => {
        if (names.includes('withTransaction')) return m;
        return `import { ${names.trim()}, withTransaction } from '../db/schema.js'`;
      }
    );
  }

  if (s.includes('await one') || s.includes('await run') || s.includes('await many')) {
    // make router callbacks async where they contain await but aren't async
    s = s.replace(
      /router\.(get|post|put|delete)\(([^,]+),\s*(requireAuth|requireAdmin|limitAuth|limitClaim|limitConvert|optionalAuth),\s*\(req,\s*res\)\s*=>/g,
      'router.$1($2, $3, async (req, res) =>'
    );
    s = s.replace(
      /router\.(get|post|put|delete)\(([^,]+),\s*\(req,\s*res\)\s*=>/g,
      'router.$1($2, async (req, res) =>'
    );
  }

  if (s !== orig) {
    fs.writeFileSync(f, s);
    console.log('fixed', f);
  }
}

// report remaining
console.log('\n=== remaining db. ===');
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (/\bdb\.(prepare|transaction|exec)\b/.test(s)) {
    const lines = s.split('\n');
    lines.forEach((l, i) => {
      if (/\bdb\.(prepare|transaction|exec)\b/.test(l)) {
        console.log(f + ':' + (i + 1), l.trim().slice(0, 100));
      }
    });
  }
}
