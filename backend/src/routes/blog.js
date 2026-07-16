import { Router } from 'express';
import { one, many, run, sqlNow } from '../db/schema.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

router.get('/', async (req, res) => {
  const cat = req.query.category;
  let posts;
  if (cat) {
    posts = await many(
      `SELECT id, slug, title, excerpt, cover_url, views, created_at, category
       FROM blog_posts WHERE published = 1 AND category = ?
       ORDER BY created_at DESC LIMIT 50`,
      [cat]
    );
  } else {
    posts = await many(
      `SELECT id, slug, title, excerpt, cover_url, views, created_at, category
       FROM blog_posts WHERE published = 1 ORDER BY created_at DESC LIMIT 50`
    );
  }
  res.json({
    posts: posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverUrl: p.cover_url,
      views: p.views,
      category: p.category || 'Tin tức',
      createdAt: p.created_at,
    })),
  });
});

router.get('/categories', async (_req, res) => {
  try {
    const rows = await many(
      `SELECT category, COUNT(*) as c FROM blog_posts
       WHERE published = 1 AND category IS NOT NULL AND category != ''
       GROUP BY category ORDER BY c DESC`
    );
    res.json({
      categories: rows.map((r) => ({ name: r.category, count: Number(r.c) })),
    });
  } catch {
    res.json({ categories: [] });
  }
});

router.get('/admin/all', requireAdmin, async (_req, res) => {
  const posts = await many(
    'SELECT * FROM blog_posts ORDER BY created_at DESC'
  );
  res.json({ posts });
});

router.post('/admin', requireAdmin, async (req, res) => {
  const {
    title,
    excerpt,
    content,
    coverUrl,
    published = 1,
    category = 'Tin tức',
  } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Thiếu title/content' });
  }
  let slug = slugify(title);
  let i = 0;
  while (await one('SELECT id FROM blog_posts WHERE slug = ?', [slug])) {
    i += 1;
    slug = `${slugify(title)}-${i}`;
  }
  const info = await run(
    `INSERT INTO blog_posts (slug, title, excerpt, content, cover_url, published, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      slug,
      title,
      excerpt || '',
      content,
      coverUrl || null,
      published ? 1 : 0,
      category || 'Tin tức',
    ]
  );
  res.json({ id: info.lastInsertRowid, slug });
});

router.put('/admin/:id', requireAdmin, async (req, res) => {
  const { title, excerpt, content, coverUrl, published, category } = req.body;
  await run(
    `UPDATE blog_posts SET
      title = COALESCE(?, title),
      excerpt = COALESCE(?, excerpt),
      content = COALESCE(?, content),
      cover_url = COALESCE(?, cover_url),
      published = COALESCE(?, published),
      category = COALESCE(?, category),
      updated_at = ${sqlNow()}
     WHERE id = ?`,
    [
      title || null,
      excerpt ?? null,
      content || null,
      coverUrl ?? null,
      published == null ? null : published ? 1 : 0,
      category ?? null,
      req.params.id,
    ]
  );
  res.json({ success: true });
});

router.delete('/admin/:id', requireAdmin, async (req, res) => {
  await run('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/:slug', async (req, res) => {
  const p = await one(
    'SELECT * FROM blog_posts WHERE slug = ? AND published = 1',
    [req.params.slug]
  );
  if (!p) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  await run('UPDATE blog_posts SET views = views + 1 WHERE id = ?', [p.id]);
  res.json({
    post: {
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      coverUrl: p.cover_url,
      views: p.views + 1,
      createdAt: p.created_at,
    },
  });
});

export default router;
