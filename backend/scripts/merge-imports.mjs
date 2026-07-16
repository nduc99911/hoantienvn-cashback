import fs from 'fs';
import path from 'path';

function walk(d, a = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, a);
    else if (p.endsWith('.js')) a.push(p);
  }
  return a;
}

for (const f of walk('src')) {
  let s = fs.readFileSync(f, 'utf8');
  const re =
    /import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/db\/schema\.js['"];?\s*\n?/g;
  const re2 =
    /import\s*\{([^}]+)\}\s*from\s*['"]\.\/db\/schema\.js['"];?\s*\n?/g;
  const isIndex = f.includes('index.js');
  const pattern = isIndex ? re2 : re;
  const fromPath = isIndex ? './db/schema.js' : '../db/schema.js';

  const names = new Set();
  let m;
  const p = new RegExp(pattern.source, 'g');
  while ((m = p.exec(s))) {
    m[1]
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((n) => names.add(n));
  }
  if (names.size === 0) continue;

  const count = (s.match(new RegExp(pattern.source, 'g')) || []).length;
  if (count <= 1) {
    // still check duplicate identifiers in single import
    const single = s.match(
      new RegExp(
        `import\\\\s*\\\\{([^}]+)\\\\}\\\\s*from\\\\s*['"]${fromPath.replace('.', '\\\\.')}['"]`
      )
    );
    if (single) {
      const parts = single[1].split(',').map((x) => x.trim()).filter(Boolean);
      const uniq = [...new Set(parts)];
      if (uniq.length !== parts.length) {
        s = s.replace(
          single[0],
          `import { ${uniq.join(', ')} } from '${fromPath}'`
        );
        fs.writeFileSync(f, s);
        console.log('dedupe', f);
      }
    }
    continue;
  }

  s = s.replace(new RegExp(pattern.source, 'g'), '');
  const insert = `import { ${[...names].join(', ')} } from '${fromPath}';\n`;
  // place after last remaining import
  const lines = s.split('\n');
  let lastImp = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImp = i;
  }
  lines.splice(lastImp + 1, 0, insert.trimEnd());
  fs.writeFileSync(f, lines.join('\n'));
  console.log('merged', f, [...names].join(','));
}
