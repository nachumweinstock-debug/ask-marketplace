import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';

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

  // TODO: notification hook — notify session host when a new person joins (future upgrade)

  res.json({ attendee_count: updated.attendee_count, joined: true });
});

export default router;
