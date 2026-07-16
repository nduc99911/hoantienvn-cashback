import { Router } from 'express';
import { db } from '../db/schema.js';
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

router.get('/', (_req, res) => {
  const posts = db
    .prepare(
      `SELECT id, slug, title, excerpt, cover_url, views, created_at
       FROM blog_posts WHERE published = 1 ORDER BY created_at DESC LIMIT 50`
    )
    .all();
  res.json({
    posts: posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverUrl: p.cover_url,
      views: p.views,
      createdAt: p.created_at,
    })),
  });
});

// Admin routes BEFORE /:slug
router.get('/admin/all', requireAdmin, (_req, res) => {
  const posts = db
    .prepare('SELECT * FROM blog_posts ORDER BY created_at DESC')
    .all();
  res.json({ posts });
});

router.post('/admin', requireAdmin, (req, res) => {
  const { title, excerpt, content, coverUrl, published = 1 } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Thiếu title/content' });
  }
  let slug = slugify(title);
  let i = 0;
  while (db.prepare('SELECT id FROM blog_posts WHERE slug = ?').get(slug)) {
    i += 1;
    slug = `${slugify(title)}-${i}`;
  }
  const info = db
    .prepare(
      `INSERT INTO blog_posts (slug, title, excerpt, content, cover_url, published)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(slug, title, excerpt || '', content, coverUrl || null, published ? 1 : 0);
  res.json({ id: info.lastInsertRowid, slug });
});

router.put('/admin/:id', requireAdmin, (req, res) => {
  const { title, excerpt, content, coverUrl, published } = req.body;
  db.prepare(
    `UPDATE blog_posts SET
      title = COALESCE(?, title),
      excerpt = COALESCE(?, excerpt),
      content = COALESCE(?, content),
      cover_url = COALESCE(?, cover_url),
      published = COALESCE(?, published),
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title || null,
    excerpt ?? null,
    content || null,
    coverUrl ?? null,
    published == null ? null : published ? 1 : 0,
    req.params.id
  );
  res.json({ success: true });
});

router.delete('/admin/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/:slug', (req, res) => {
  const p = db
    .prepare('SELECT * FROM blog_posts WHERE slug = ? AND published = 1')
    .get(req.params.slug);
  if (!p) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  db.prepare('UPDATE blog_posts SET views = views + 1 WHERE id = ?').run(p.id);
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
