import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listNotifications,
  markRead,
  markAllRead,
} from '../services/notifications.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const rows = listNotifications(req.user);
  res.json({
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    })),
    unread: rows.filter((n) => !n.is_read).length,
  });
});

router.post('/:id/read', requireAuth, (req, res) => {
  markRead(req.user.id, req.params.id);
  res.json({ success: true });
});

router.post('/read-all', requireAuth, (req, res) => {
  markAllRead(req.user);
  res.json({ success: true });
});

export default router;
