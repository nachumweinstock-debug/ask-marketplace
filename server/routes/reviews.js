import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.post('/', requireAuth, (req, res) => {
  const { booking_id, rating, comment } = req.body;
  if (!booking_id || !rating) return res.status(400).json({ error: 'booking_id and rating required' });
  if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });
  if (comment && comment.length > 1000) return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND student_id = ?').get(booking_id, req.user.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (!['completed', 'confirmed'].includes(booking.status)) return res.status(400).json({ error: 'Can only review confirmed or completed bookings' });

  const existing = db.prepare('SELECT id FROM reviews WHERE booking_id = ?').get(booking_id);
  if (existing) return res.status(400).json({ error: 'Already reviewed' });

  const result = db.prepare(
    'INSERT INTO reviews (booking_id, student_id, provider_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
  ).run(booking_id, req.user.id, booking.provider_id, rating, comment || null);

  const stats = db.prepare(
    'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE provider_id = ?'
  ).get(booking.provider_id);
  db.prepare(
    'UPDATE provider_profiles SET rating = ?, review_count = ? WHERE id = ?'
  ).run(Math.round(stats.avg * 10) / 10, stats.count, booking.provider_id);

  res.json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid));
});

export default router;
