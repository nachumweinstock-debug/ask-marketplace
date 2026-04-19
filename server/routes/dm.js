import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { sendDmNotification } from '../email.js';

const router = Router();

// GET /dm/unread — unread DM count + latest sender info (for navbar badge + toast)
router.get('/unread', requireAuth, (req, res) => {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM direct_messages WHERE receiver_id = ? AND read_at IS NULL'
  ).get(req.user.id);

  // Latest unread for in-app toast notification
  const latest = db.prepare(`
    SELECT dm.body, dm.sender_id, dm.is_system, u.name as sender_name, u.avatar_url as sender_avatar
    FROM direct_messages dm
    JOIN users u ON u.id = dm.sender_id
    WHERE dm.receiver_id = ? AND dm.read_at IS NULL
    ORDER BY dm.created_at DESC LIMIT 1
  `).get(req.user.id);

  res.json({ count: row.count, latest: latest || null });
});

// GET /dm — list conversations (latest message per partner)
router.get('/', requireAuth, (req, res) => {
  const me = req.user.id;

  const partners = db.prepare(`
    SELECT DISTINCT
      CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_id
    FROM direct_messages
    WHERE sender_id = ? OR receiver_id = ?
  `).all(me, me, me);

  const convos = partners.map(({ other_id }) => {
    const lastMsg = db.prepare(`
      SELECT body, created_at FROM direct_messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at DESC LIMIT 1
    `).get(me, other_id, other_id, me);

    const unread = db.prepare(`
      SELECT COUNT(*) as count FROM direct_messages
      WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL
    `).get(other_id, me);

    const user = db.prepare('SELECT id, name, avatar_url FROM users WHERE id = ?').get(other_id);

    return {
      other_id,
      other_name: user?.name || 'Unknown',
      other_avatar_url: user?.avatar_url || null,
      last_message: lastMsg?.body || '',
      last_at: lastMsg?.created_at || null,
      unread_count: unread?.count || 0,
    };
  });

  convos.sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
  res.json(convos);
});

// GET /dm/:userId — get messages with a user, mark incoming as read
router.get('/:userId', requireAuth, (req, res) => {
  const me = req.user.id;
  const other = Number(req.params.userId);

  db.prepare(
    'UPDATE direct_messages SET read_at = CURRENT_TIMESTAMP WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL'
  ).run(other, me);

  const messages = db.prepare(`
    SELECT dm.*, u.name as sender_name, u.avatar_url as sender_avatar_url
    FROM direct_messages dm
    JOIN users u ON u.id = dm.sender_id
    WHERE (dm.sender_id = ? AND dm.receiver_id = ?) OR (dm.sender_id = ? AND dm.receiver_id = ?)
    ORDER BY dm.created_at ASC
  `).all(me, other, other, me);

  res.json(messages);
});

// POST /dm/:userId — send a message
router.post('/:userId', requireAuth, (req, res) => {
  const me = req.user.id;
  const other = Number(req.params.userId);
  const { body } = req.body;

  if (!body?.trim()) return res.status(400).json({ error: 'Message body required' });
  if (body.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
  if (other === me) return res.status(400).json({ error: 'Cannot message yourself' });

  const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(other);
  if (!receiver) return res.status(404).json({ error: 'User not found' });

  const result = db.prepare(
    'INSERT INTO direct_messages (sender_id, receiver_id, body) VALUES (?, ?, ?)'
  ).run(me, other, body.trim());

  const msg = db.prepare(`
    SELECT dm.*, u.name as sender_name, u.avatar_url as sender_avatar_url
    FROM direct_messages dm
    JOIN users u ON u.id = dm.sender_id
    WHERE dm.id = ?
  `).get(result.lastInsertRowid);

  // Email notification — only on the FIRST unread from this sender (prevents spam)
  const alreadyUnread = db.prepare(
    'SELECT COUNT(*) as n FROM direct_messages WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL AND id != ?'
  ).get(me, other, result.lastInsertRowid).n;

  if (alreadyUnread === 0) {
    const receiverUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(other);
    if (receiverUser?.email) {
      const preview = body.trim().length > 200 ? body.trim().slice(0, 197) + '…' : body.trim();
      sendDmNotification({
        toEmail: receiverUser.email,
        toName: receiverUser.name,
        fromName: req.user.name,
        preview,
      }).catch(err => console.error(`[EMAIL] DM notification failed → ${receiverUser.email}:`, err.message));
    }
  }

  res.json(msg);
});

export default router;
