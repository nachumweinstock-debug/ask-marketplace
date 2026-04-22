import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';
import { sendConnectionRequestEmail, sendConnectionAcceptedEmail } from '../email.js';

const router = Router();

// GET /people — browse all users; includes connection status when authenticated
router.get('/', optionalAuth, (req, res) => {
  const { search } = req.query;
  const me = req.user?.id;

  // Use a subquery to pick only the most recent listing per user —
  // without this, users with multiple listings appear once per listing.
  const ppSubquery = `(
    SELECT * FROM provider_profiles
    WHERE id IN (SELECT MAX(id) FROM provider_profiles GROUP BY user_id)
  )`;

  let query, params;
  if (me) {
    query = `
      SELECT u.id, u.name, u.avatar_url, u.major, u.classes_taking, u.user_bio, u.role, u.created_at,
             pp.id    as provider_profile_id,
             pp.category, pp.custom_category, pp.price_per_session, pp.rating, pp.review_count,
             c.id     as connection_id,
             c.status as connection_status,
             c.requester_id
      FROM users u
      LEFT JOIN ${ppSubquery} pp ON pp.user_id = u.id
      LEFT JOIN connections c ON (
        (c.requester_id = ? AND c.receiver_id = u.id) OR
        (c.receiver_id  = ? AND c.requester_id = u.id)
      )
      WHERE u.id != ?     `;
    params = [me, me, me];
  } else {
    query = `
      SELECT u.id, u.name, u.avatar_url, u.major, u.classes_taking, u.user_bio, u.role, u.created_at,
             pp.id    as provider_profile_id,
             pp.category, pp.custom_category, pp.price_per_session, pp.rating, pp.review_count,
             NULL as connection_id,
             NULL as connection_status,
             NULL as requester_id
      FROM users u
      LEFT JOIN ${ppSubquery} pp ON pp.user_id = u.id
      WHERE 1=1
    `;
    params = [];
  }

  if (search) {
    query += ' AND (u.name LIKE ? OR u.major LIKE ? OR u.classes_taking LIKE ? OR u.user_bio LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  query += ' ORDER BY u.name ASC';

  const users = db.prepare(query).all(...params);
  res.json(users);
});

// GET /people/:id — single user's public profile
router.get('/:id', optionalAuth, (req, res) => {
  const me = req.user?.id;
  const targetId = req.params.id;

  const ppSub = `(SELECT * FROM provider_profiles WHERE id IN (SELECT MAX(id) FROM provider_profiles GROUP BY user_id))`;
  let u;
  if (me) {
    u = db.prepare(`
      SELECT u.id, u.name, u.avatar_url, u.major, u.classes_taking, u.user_bio, u.role, u.created_at,
             pp.id    as provider_profile_id,
             pp.category, pp.custom_category, pp.bio as listing_bio,
             pp.price_per_session, pp.rating, pp.review_count,
             pp.zelle, pp.venmo,
             c.id     as connection_id,
             c.status as connection_status,
             c.requester_id
      FROM users u
      LEFT JOIN ${ppSub} pp ON pp.user_id = u.id
      LEFT JOIN connections c ON (
        (c.requester_id = ? AND c.receiver_id  = u.id) OR
        (c.receiver_id  = ? AND c.requester_id = u.id)
      )
      WHERE u.id = ?     `).get(me, me, targetId);
  } else {
    u = db.prepare(`
      SELECT u.id, u.name, u.avatar_url, u.major, u.classes_taking, u.user_bio, u.role, u.created_at,
             pp.id    as provider_profile_id,
             pp.category, pp.custom_category, pp.bio as listing_bio,
             pp.price_per_session, pp.rating, pp.review_count,
             pp.zelle, pp.venmo,
             NULL as connection_id,
             NULL as connection_status,
             NULL as requester_id
      FROM users u
      LEFT JOIN ${ppSub} pp ON pp.user_id = u.id
      WHERE u.id = ?     `).get(targetId);
  }

  if (!u) return res.status(404).json({ error: 'User not found' });

  let mutualConnections = [];
  if (me) {
    mutualConnections = db.prepare(`
      SELECT u2.id, u2.name, u2.avatar_url
      FROM connections c1
      JOIN connections c2 ON (
        (c2.requester_id = ? OR c2.receiver_id = ?) AND
        (
          (c1.requester_id = u2.id OR c1.receiver_id = u2.id) AND
          (c2.requester_id = u2.id OR c2.receiver_id = u2.id)
        ) AND c1.status = 'accepted' AND c2.status = 'accepted'
      )
      JOIN users u2 ON u2.id = CASE
        WHEN c1.requester_id = ? THEN c1.receiver_id ELSE c1.requester_id
      END
      WHERE (c1.requester_id = ? OR c1.receiver_id = ?) AND c1.status = 'accepted'
        AND u2.id != ? AND u2.id != ?
      LIMIT 6
    `).all(me, me, targetId, targetId, targetId, me, targetId);
  }

  res.json({ ...u, mutual_connections: mutualConnections });
});

// GET /people/connections/mine — my accepted connections + pending requests
router.get('/connections/mine', requireAuth, (req, res) => {
  const ppSubConn = `(SELECT * FROM provider_profiles WHERE id IN (SELECT MAX(id) FROM provider_profiles GROUP BY user_id))`;
  const accepted = db.prepare(`
    SELECT u.id, u.name, u.avatar_url, u.major, u.user_bio,
           pp.id as provider_profile_id, pp.category, pp.custom_category,
           c.id as connection_id, c.status, c.requester_id, c.created_at
    FROM connections c
    JOIN users u ON u.id = CASE
      WHEN c.requester_id = ? THEN c.receiver_id ELSE c.requester_id
    END
    LEFT JOIN ${ppSubConn} pp ON pp.user_id = u.id
    WHERE (c.requester_id = ? OR c.receiver_id = ?) AND c.status = 'accepted'
    ORDER BY u.name ASC
  `).all(req.user.id, req.user.id, req.user.id);

  const pending_received = db.prepare(`
    SELECT u.id, u.name, u.avatar_url, u.major, u.user_bio,
           c.id as connection_id, c.created_at
    FROM connections c
    JOIN users u ON u.id = c.requester_id
    WHERE c.receiver_id = ? AND c.status = 'pending'
    ORDER BY c.created_at DESC
  `).all(req.user.id);

  const pending_sent = db.prepare(`
    SELECT u.id, u.name, u.avatar_url, u.major,
           c.id as connection_id, c.created_at
    FROM connections c
    JOIN users u ON u.id = c.receiver_id
    WHERE c.requester_id = ? AND c.status = 'pending'
    ORDER BY c.created_at DESC
  `).all(req.user.id);

  res.json({ accepted, pending_received, pending_sent });
});

// POST /connections — send a connection request
router.post('/connections', requireAuth, (req, res) => {
  const { receiver_id } = req.body;
  if (!receiver_id) return res.status(400).json({ error: 'receiver_id required' });
  if (receiver_id === req.user.id) return res.status(400).json({ error: 'Cannot connect with yourself' });

  // Check if a connection already exists in either direction
  const existing = db.prepare(`
    SELECT * FROM connections
    WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
  `).get(req.user.id, receiver_id, receiver_id, req.user.id);

  if (existing) {
    // They already sent us a request — auto-accept it
    if (existing.requester_id === receiver_id && existing.status === 'pending') {
      db.prepare('UPDATE connections SET status = ? WHERE id = ?').run('accepted', existing.id);
      // Notify the original requester that we accepted
      const requesterUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(receiver_id);
      if (requesterUser) {
        sendConnectionAcceptedEmail({
          toEmail: requesterUser.email, toName: requesterUser.name, fromName: req.user.name,
        }).catch(() => {});
      }
      return res.json({ ...existing, status: 'accepted' });
    }
    return res.status(400).json({ error: 'Connection already exists' });
  }

  const result = db.prepare(
    'INSERT INTO connections (requester_id, receiver_id) VALUES (?, ?)'
  ).run(req.user.id, receiver_id);

  // Notify the receiver of the new connection request
  const receiverUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(receiver_id);
  if (receiverUser) {
    sendConnectionRequestEmail({
      toEmail: receiverUser.email, toName: receiverUser.name, fromName: req.user.name,
    }).catch(() => {});
  }

  res.json(db.prepare('SELECT * FROM connections WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /connections/:id — accept a pending request (receiver only)
router.patch('/connections/:id', requireAuth, (req, res) => {
  const conn = db.prepare('SELECT * FROM connections WHERE id = ?').get(req.params.id);
  if (!conn) return res.status(404).json({ error: 'Connection not found' });
  if (conn.receiver_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (conn.status !== 'pending') return res.status(400).json({ error: 'Already responded' });

  db.prepare('UPDATE connections SET status = ? WHERE id = ?').run('accepted', conn.id);

  // Notify the requester that their request was accepted
  const requesterUser = db.prepare('SELECT email, name FROM users WHERE id = ?').get(conn.requester_id);
  if (requesterUser) {
    sendConnectionAcceptedEmail({
      toEmail: requesterUser.email, toName: requesterUser.name, fromName: req.user.name,
    }).catch(() => {});
  }

  res.json({ ...conn, status: 'accepted' });
});

// DELETE /connections/:id — remove or reject a connection
router.delete('/connections/:id', requireAuth, (req, res) => {
  const conn = db.prepare('SELECT * FROM connections WHERE id = ?').get(req.params.id);
  if (!conn) return res.status(404).json({ error: 'Not found' });
  if (conn.requester_id !== req.user.id && conn.receiver_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.prepare('DELETE FROM connections WHERE id = ?').run(conn.id);
  res.json({ ok: true });
});

export default router;
