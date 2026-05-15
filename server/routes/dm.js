import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { sendDmNotification } from '../email.js';
import { smsNewDm } from '../sms.js';
import { redactContactText } from '../redact.js';

const router = Router();

function requireAdmin(req, res, next) {
  const admin = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!admin?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

function pairKey(a, b) {
  return [Number(a), Number(b)].sort((x, y) => x - y).join('-');
}

function parsePairKey(key) {
  const [a, b] = String(key).split('-').map(Number);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0 || a === b) return null;
  return [a, b].sort((x, y) => x - y);
}

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
      last_message: redactContactText(lastMsg?.body || ''),
      last_at: lastMsg?.created_at || null,
      unread_count: unread?.count || 0,
    };
  });

  convos.sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
  res.json(convos);
});

// GET /dm/admin/conversations — admin-only read-only list of all direct-message threads
router.get('/admin/conversations', requireAuth, requireAdmin, (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();

  const rows = db.prepare(`
    WITH pairs AS (
      SELECT
        CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END AS user_a_id,
        CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END AS user_b_id,
        MAX(id) AS last_id,
        COUNT(*) AS message_count,
        SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) AS unread_count
      FROM direct_messages
      GROUP BY user_a_id, user_b_id
    )
    SELECT
      p.user_a_id,
      p.user_b_id,
      p.message_count,
      p.unread_count,
      last.body AS last_message,
      last.created_at AS last_at,
      last.is_system AS last_is_system,
      ua.name AS user_a_name,
      ua.email AS user_a_email,
      ua.avatar_url AS user_a_avatar_url,
      ub.name AS user_b_name,
      ub.email AS user_b_email,
      ub.avatar_url AS user_b_avatar_url
    FROM pairs p
    JOIN direct_messages last ON last.id = p.last_id
    JOIN users ua ON ua.id = p.user_a_id
    JOIN users ub ON ub.id = p.user_b_id
    ORDER BY last.created_at DESC
    LIMIT 300
  `).all();

  const normalized = rows.map(row => ({
    ...row,
    last_message: redactContactText(row.last_message),
    pair_key: pairKey(row.user_a_id, row.user_b_id),
  }));

  const filtered = search
    ? normalized.filter(row => [
      row.user_a_name,
      row.user_a_email,
      row.user_b_name,
      row.user_b_email,
      row.last_message,
    ].some(value => String(value || '').toLowerCase().includes(search)))
    : normalized;

  res.json(filtered);
});

// GET /dm/admin/conversations/:pairKey — admin-only read-only messages for one DM thread
router.get('/admin/conversations/:pairKey', requireAuth, requireAdmin, (req, res) => {
  const ids = parsePairKey(req.params.pairKey);
  if (!ids) return res.status(400).json({ error: 'Invalid conversation' });
  const [a, b] = ids;

  const participants = db.prepare(`
    SELECT id, name, email, avatar_url
    FROM users
    WHERE id IN (?, ?)
    ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END
  `).all(a, b, a);

  if (participants.length !== 2) return res.status(404).json({ error: 'Users not found' });

  const messages = db.prepare(`
    SELECT
      dm.*,
      sender.name AS sender_name,
      sender.email AS sender_email,
      sender.avatar_url AS sender_avatar_url,
      receiver.name AS receiver_name,
      receiver.email AS receiver_email,
      receiver.avatar_url AS receiver_avatar_url
    FROM direct_messages dm
    JOIN users sender ON sender.id = dm.sender_id
    JOIN users receiver ON receiver.id = dm.receiver_id
    WHERE (dm.sender_id = ? AND dm.receiver_id = ?) OR (dm.sender_id = ? AND dm.receiver_id = ?)
    ORDER BY dm.created_at ASC
  `).all(a, b, b, a).map(message => ({
    ...message,
    body: redactContactText(message.body),
  }));

  res.json({
    pair_key: pairKey(a, b),
    participants,
    messages,
  });
});

// GET /dm/:userId — get messages with a user, mark incoming as read
router.get('/:userId', requireAuth, (req, res) => {
  const me = req.user.id;
  const other = Number(req.params.userId);

  db.prepare(
    'UPDATE direct_messages SET read_at = CURRENT_TIMESTAMP WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL'
  ).run(other, me);

  // Reset nudge log for this conversation so the cycle restarts if they get new messages later
  db.prepare('DELETE FROM dm_nudge_log WHERE receiver_id = ? AND sender_id = ?').run(me, other);

  const messages = db.prepare(`
    SELECT dm.*, u.name as sender_name, u.avatar_url as sender_avatar_url
    FROM direct_messages dm
    JOIN users u ON u.id = dm.sender_id
    WHERE (dm.sender_id = ? AND dm.receiver_id = ?) OR (dm.sender_id = ? AND dm.receiver_id = ?)
    ORDER BY dm.created_at ASC
  `).all(me, other, other, me).map(message => ({
    ...message,
    body: redactContactText(message.body),
  }));

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
  const cleanBody = redactContactText(body.trim());

  const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(other);
  if (!receiver) return res.status(404).json({ error: 'User not found' });

  const result = db.prepare(
    'INSERT INTO direct_messages (sender_id, receiver_id, body) VALUES (?, ?, ?)'
  ).run(me, other, cleanBody);

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
    const receiverUser = db.prepare('SELECT email, name, phone FROM users WHERE id = ?').get(other);
    if (receiverUser) {
      // Encrypted bodies start with 'enc:v1:' — show generic text so ciphertext isn't emailed
      const rawBody = cleanBody;
      const preview = rawBody.startsWith('enc:v1:')
        ? '🔒 Encrypted message — open ASK to read it.'
        : rawBody.length > 200 ? rawBody.slice(0, 197) + '…' : rawBody;
      if (receiverUser.email) {
        sendDmNotification({
          toEmail: receiverUser.email,
          toName: receiverUser.name,
          fromName: req.user.name,
          preview,
        }).catch(err => console.error(`[EMAIL] DM notification failed → ${receiverUser.email}:`, err.message));
      }
      smsNewDm({
        phone: receiverUser.phone,
        senderName: req.user.name,
      }).catch(() => {});
    }
  }

  res.json(msg);
});

export default router;
