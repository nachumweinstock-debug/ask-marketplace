import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function listingRows(userId) {
  return db.prepare(`
    SELECT pp.*, u.name, u.email, u.username, u.avatar_url,
      st.created_at as saved_at,
      1 as saved,
      (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'completed') as completed_sessions
    FROM saved_tutors st
    JOIN provider_profiles pp ON pp.id = st.tutor_id
    JOIN users u ON u.id = pp.user_id
    WHERE st.user_id = ?
    ORDER BY st.created_at DESC
  `).all(userId);
}

router.get('/', requireAuth, (req, res) => {
  res.json(listingRows(req.user.id));
});

router.get('/ids', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT tutor_id FROM saved_tutors WHERE user_id = ?').all(req.user.id);
  res.json(rows.map((row) => row.tutor_id));
});

router.post('/:tutorId', requireAuth, (req, res) => {
  const tutor = db.prepare('SELECT id FROM provider_profiles WHERE id = ?').get(req.params.tutorId);
  if (!tutor) return res.status(404).json({ error: 'Tutor not found' });
  db.prepare('INSERT OR IGNORE INTO saved_tutors (user_id, tutor_id) VALUES (?, ?)').run(req.user.id, tutor.id);
  res.json({ saved: true, tutor_id: tutor.id });
});

router.delete('/:tutorId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM saved_tutors WHERE user_id = ? AND tutor_id = ?').run(req.user.id, req.params.tutorId);
  res.json({ saved: false, tutor_id: Number(req.params.tutorId) });
});

export default router;
