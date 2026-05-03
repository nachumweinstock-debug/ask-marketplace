import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function remindersFor(userId) {
  return db.prepare(`
    SELECT b.id as booking_id, b.status, a.date, a.start_time, a.end_time,
           pp.id as provider_profile_id,
           provider.name as provider_name,
           student.name as student_name,
           CASE
             WHEN datetime(a.date || ' ' || a.start_time) <= datetime('now', '+20 minutes') THEN 'starts soon'
             WHEN datetime(a.date || ' ' || a.start_time) <= datetime('now', '+1 hour') THEN 'starts in 1 hour'
             ELSE 'upcoming today'
           END as reminder_state
    FROM bookings b
    JOIN availability a ON a.id = b.availability_id
    JOIN provider_profiles pp ON pp.id = b.provider_id
    JOIN users provider ON provider.id = pp.user_id
    JOIN users student ON student.id = b.student_id
    WHERE b.status = 'confirmed'
      AND date(a.date) = date('now')
      AND (b.student_id = ? OR pp.user_id = ?)
      AND NOT EXISTS (
        SELECT 1 FROM session_reminders sr
        WHERE sr.user_id = ?
          AND sr.booking_id = b.id
          AND sr.reminder_type = 'manual'
          AND sr.dismissed_at IS NOT NULL
      )
    ORDER BY a.start_time ASC
  `).all(userId, userId, userId);
}

router.get('/', requireAuth, (req, res) => {
  res.json(remindersFor(req.user.id));
});

router.post('/:bookingId/dismiss', requireAuth, (req, res) => {
  db.prepare(`
    INSERT OR IGNORE INTO session_reminders (user_id, booking_id, reminder_type, dismissed_at)
    VALUES (?, ?, 'manual', CURRENT_TIMESTAMP)
  `).run(req.user.id, req.params.bookingId);
  res.json({ ok: true });
});

export default router;
