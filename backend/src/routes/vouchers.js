import { Router } from 'express';
import { one, many, run } from '../db/schema.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

function mapVoucher(v) {
  return {
    id: v.id,
    platform: v.platform,
    code: v.code,
    title: v.title,
    description: v.description,
    discountLabel: v.discount_label,
    minOrder: v.min_order,
    maxDiscount: v.max_discount,
    deepLink: v.deep_link,
    expiresAt: v.expires_at,
    usedPercent: v.used_percent,
    sortOrder: v.sort_order,
    active: v.active,
    createdAt: v.created_at,
  };
}

/** Public list */
router.get('/', async (_req, res) => {
  try {
    const rows = await many(
      `SELECT * FROM vouchers WHERE active = 1
       ORDER BY sort_order ASC, id DESC LIMIT 50`
    );
    res.json({ vouchers: rows.map(mapVoucher) });
  } catch (e) {
    res.json({ vouchers: [] });
  }
});

/** Admin */
router.get(
  '/admin/all',
  requirePermission('settings.write'),
  async (_req, res) => {
    const rows = await many(
      `SELECT * FROM vouchers ORDER BY sort_order ASC, id DESC LIMIT 200`
    );
    res.json({ vouchers: rows.map(mapVoucher) });
  }
);

router.post(
  '/admin',
  requirePermission('settings.write'),
  async (req, res) => {
    try {
      const {
        platform = 'shopee',
        code,
        title,
        description,
        discountLabel,
        minOrder,
        maxDiscount,
        deepLink,
        expiresAt,
        usedPercent,
        sortOrder,
        active,
      } = req.body;
      if (!code || !title) {
        return res.status(400).json({ error: 'Cần code và title' });
      }
      const info = await run(
        `INSERT INTO vouchers
         (platform, code, title, description, discount_label, min_order, max_discount,
          deep_link, expires_at, used_percent, sort_order, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          platform,
          String(code).trim(),
          title.trim(),
          description || '',
          discountLabel || '',
          Number(minOrder) || 0,
          Number(maxDiscount) || 0,
          deepLink || '',
          expiresAt || null,
          Number(usedPercent) || 0,
          Number(sortOrder) || 0,
          active === 0 || active === false ? 0 : 1,
        ]
      );
      const v = await one('SELECT * FROM vouchers WHERE id = ?', [
        info.lastInsertRowid,
      ]);
      res.json({ voucher: mapVoucher(v) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

router.put(
  '/admin/:id',
  requirePermission('settings.write'),
  async (req, res) => {
    try {
      const b = req.body;
      await run(
        `UPDATE vouchers SET
          platform = COALESCE(?, platform),
          code = COALESCE(?, code),
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          discount_label = COALESCE(?, discount_label),
          min_order = COALESCE(?, min_order),
          max_discount = COALESCE(?, max_discount),
          deep_link = COALESCE(?, deep_link),
          expires_at = COALESCE(?, expires_at),
          used_percent = COALESCE(?, used_percent),
          sort_order = COALESCE(?, sort_order),
          active = COALESCE(?, active)
         WHERE id = ?`,
        [
          b.platform ?? null,
          b.code ?? null,
          b.title ?? null,
          b.description ?? null,
          b.discountLabel ?? null,
          b.minOrder != null ? Number(b.minOrder) : null,
          b.maxDiscount != null ? Number(b.maxDiscount) : null,
          b.deepLink ?? null,
          b.expiresAt ?? null,
          b.usedPercent != null ? Number(b.usedPercent) : null,
          b.sortOrder != null ? Number(b.sortOrder) : null,
          b.active != null ? (b.active ? 1 : 0) : null,
          req.params.id,
        ]
      );
      const v = await one('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
      res.json({ voucher: mapVoucher(v) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

router.delete(
  '/admin/:id',
  requirePermission('settings.write'),
  async (req, res) => {
    await run('DELETE FROM vouchers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  }
);

export default router;
