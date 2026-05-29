import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import posthog from '../posthog.js';
import { sendNewReviewNotification, sendAdminReviewNotification } from '../email.js';
import { pushNewReview, pushToAdmins } from '../push.js';

const router = Router();

router.post('/', requireAuth, (req, res) => {
  const { booking_id, rating, comment } = req.body;
  if (!booking_id || !rating) return res.status(400).json({ error: 'booking_id and rating required' });
  if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });
  if (comment && comment.length > 1000) return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND student_id = ?').get(booking_id, req.user.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'completed') return res.status(400).json({ error: 'Mark the session as done before leaving a review' });

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

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);

  posthog.capture({
    distinctId: String(req.user.id),
    event: 'review_submitted',
    properties: {
      review_id: review.id,
      booking_id,
      provider_id: booking.provider_id,
      rating: Number(rating),
      has_comment: !!comment,
    },
  });

  // Notify provider and admin of new review (non-blocking)
  try {
    const providerUser = db.prepare(`
      SELECT u.email, u.name FROM provider_profiles pp
      JOIN users u ON pp.user_id = u.id WHERE pp.id = ?
    `).get(booking.provider_id);
    const student = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    if (providerUser && student) {
      sendNewReviewNotification({
        providerEmail: providerUser.email, providerName: providerUser.name,
        studentName: student.name, rating: Number(rating), comment: comment || null,
      }).catch(() => {});
      const providerUserId = db.prepare('SELECT user_id FROM provider_profiles WHERE id = ?').get(booking.provider_id)?.user_id;
      if (providerUserId) pushNewReview(providerUserId, { studentName: student.name, rating: Number(rating) }).catch(() => {});
      sendAdminReviewNotification({
        providerName: providerUser.name, providerEmail: providerUser.email,
        studentName: student.name, rating: Number(rating), comment: comment || null,
        bookingId: booking_id,
      }).catch(() => {});
      pushToAdmins(
        `New ${rating}-star review`,
        `${student.name} reviewed ${providerUser.name}${comment ? ': ' + comment.slice(0, 60) : ''}`,
        { screen: 'admin' }
      ).catch(() => {});
    }
  } catch { /* non-fatal */ }

  res.json(review);
});

router.post('/:id/report', requireAuth, (req, res) => {
  const { reason, details } = req.body;
  const allowed = ['spam', 'harassment', 'fake review', 'offensive content', 'other'];
  if (!allowed.includes(reason)) return res.status(400).json({ error: 'Invalid report reason' });
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  db.prepare(`
    INSERT OR IGNORE INTO review_reports (review_id, reporter_id, reason, details)
    VALUES (?, ?, ?, ?)
  `).run(review.id, req.user.id, reason, String(details || '').slice(0, 1000));
  posthog.capture({
    distinctId: String(req.user.id),
    event: 'review_reported',
    properties: { review_id: review.id, provider_id: review.provider_id, reason },
  });
  pushToAdmins(
    'Review reported',
    `Review #${review.id} flagged for "${reason}"${details ? ': ' + String(details).slice(0, 60) : ''}`,
    { screen: 'admin' }
  ).catch(() => {});
  res.json({ ok: true });
});

export default router;
