import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';
import { sendHangoutJoinNotification, sendHangoutChatNotification } from '../email.js';

const router = Router();

// GET /api/hangouts — all non-expired sessions, sorted by most attendees
router.get('/', optionalAuth, (req, res) => {
  const me = req.user?.id;
  let sessions;
  if (me) {
    sessions = db.prepare(`
      SELECT s.*, u.name AS host_name, u.username AS host_username, u.avatar_url AS host_avatar,
        (SELECT 1 FROM session_attendees WHERE session_id = s.id AND user_id = ?) AS joined
      FROM study_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.expires_at > datetime('now')
      ORDER BY s.attendee_count DESC, s.created_at DESC
    `).all(me);
  } else {
    sessions = db.prepare(`
      SELECT s.*, u.name AS host_name, u.username AS host_username, u.avatar_url AS host_avatar,
        0 AS joined
      FROM study_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.expires_at > datetime('now')
      ORDER BY s.attendee_count DESC, s.created_at DESC
    `).all();
  }
  res.json(sessions);
});

// POST /api/hangouts — create a new session
router.post('/', requireAuth, (req, res) => {
  const { subject, location, class_code, duration_hours } = req.body;
  if (!subject?.trim() || !location?.trim()) {
    return res.status(400).json({ error: 'subject and location are required' });
  }
  const hours = [1, 2, 3].includes(Number(duration_hours)) ? Number(duration_hours) : 2;

  const result = db.prepare(`
    INSERT INTO study_sessions (user_id, subject, location, class_code, expires_at)
    VALUES (?, ?, ?, ?, datetime('now', '+' || ? || ' hours'))
  `).run(req.user.id, subject.trim(), location.trim(), class_code?.trim() || null, String(hours));

  // Host is auto-enrolled as first attendee
  db.prepare(`INSERT OR IGNORE INTO session_attendees (session_id, user_id) VALUES (?, ?)`).run(result.lastInsertRowid, req.user.id);

  // TODO: notification hook — when a session starts, notify nearby users / followers (future upgrade)

  const session = db.prepare(`
    SELECT s.*, u.name AS host_name, u.username AS host_username, u.avatar_url AS host_avatar,
      1 AS joined
    FROM study_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(session);
});

// POST /api/hangouts/:id/join — increment attendee count
router.post('/:id/join', requireAuth, (req, res) => {
  const session = db.prepare(`
    SELECT * FROM study_sessions WHERE id = ? AND expires_at > datetime('now')
  `).get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  try {
    db.prepare(`INSERT INTO session_attendees (session_id, user_id) VALUES (?, ?)`).run(session.id, req.user.id);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Already joined' });
    }
    throw err;
  }

  db.prepare(`UPDATE study_sessions SET attendee_count = attendee_count + 1 WHERE id = ?`).run(session.id);
  const updated = db.prepare(`SELECT attendee_count FROM study_sessions WHERE id = ?`).get(session.id);

  // Email the host (unless they're the one joining)
  if (session.user_id !== req.user.id) {
    const host = db.prepare('SELECT email, name FROM users WHERE id = ?').get(session.user_id);
    if (host) {
      sendHangoutJoinNotification({
        hostEmail: host.email,
        hostName: host.name,
        joinerName: req.user.name,
        subject: session.subject,
        location: session.location,
        sessionId: session.id,
      }).catch(() => {});
    }
  }

  res.json({ attendee_count: updated.attendee_count, joined: true });
});

// GET /api/hangouts/:id/messages
router.get('/:id/messages', requireAuth, (req, res) => {
  const session = db.prepare(`SELECT id FROM study_sessions WHERE id = ? AND expires_at > datetime('now')`).get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  const isAttendee = db.prepare(`SELECT 1 FROM session_attendees WHERE session_id = ? AND user_id = ?`).get(session.id, req.user.id);
  if (!isAttendee) return res.status(403).json({ error: 'Join the session to see messages' });

  const messages = db.prepare(`
    SELECT m.id, m.body, m.created_at, u.id AS user_id, u.name, u.avatar_url
    FROM session_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.session_id = ?
    ORDER BY m.created_at ASC
  `).all(session.id);

  res.json(messages);
});

// POST /api/hangouts/:id/messages
router.post('/:id/messages', requireAuth, (req, res) => {
  const { body: msgBody } = req.body;
  if (!msgBody?.trim()) return res.status(400).json({ error: 'Message cannot be empty' });
  if (msgBody.trim().length > 500) return res.status(400).json({ error: 'Message too long' });

  const session = db.prepare(`SELECT * FROM study_sessions WHERE id = ? AND expires_at > datetime('now')`).get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  const isAttendee = db.prepare(`SELECT 1 FROM session_attendees WHERE session_id = ? AND user_id = ?`).get(session.id, req.user.id);
  if (!isAttendee) return res.status(403).json({ error: 'Join the session to chat' });

  const result = db.prepare(`
    INSERT INTO session_messages (session_id, user_id, body) VALUES (?, ?, ?)
  `).run(session.id, req.user.id, msgBody.trim());

  const message = db.prepare(`
    SELECT m.id, m.body, m.created_at, u.id AS user_id, u.name, u.avatar_url
    FROM session_messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?
  `).get(result.lastInsertRowid);

  // Notify all other attendees (fire-and-forget, cap at 10 to avoid spam)
  const others = db.prepare(`
    SELECT u.email, u.name FROM session_attendees sa
    JOIN users u ON u.id = sa.user_id
    WHERE sa.session_id = ? AND sa.user_id != ?
    LIMIT 10
  `).all(session.id, req.user.id);
  for (const attendee of others) {
    sendHangoutChatNotification({
      toEmail: attendee.email,
      toName: attendee.name,
      fromName: req.user.name,
      subject: session.subject,
      preview: msgBody.trim().slice(0, 140),
    }).catch(() => {});
  }

  res.status(201).json(message);
});

export default router;
