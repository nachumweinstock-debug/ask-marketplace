import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { sendBookingNotification, sendBookingConfirmation } from '../email.js';

const router = Router();

async function sendBookingEmails(booking, slot, student) {
  // Look up provider's email
  const providerInfo = db.prepare(`
    SELECT u.email, u.name as provider_name
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.id = ?
  `).get(booking.provider_id);
  if (!providerInfo) return;

  await sendBookingNotification({
    providerEmail: providerInfo.email,
    providerName: providerInfo.provider_name,
    studentName: student.name,
    studentEmail: student.email,
    date: slot.date,
    startTime: slot.start_time,
    endTime: slot.end_time,
  });
}

router.get('/mine', requireAuth, (req, res) => {
  // Provider view: sessions booked with me
  if (req.query.as === 'provider') {
    const profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile) return res.json([]);
    const bookings = db.prepare(`
      SELECT b.*, a.date, a.start_time, a.end_time,
             u.name as student_name, u.email as student_email
      FROM bookings b
      JOIN availability a ON b.availability_id = a.id
      JOIN users u ON b.student_id = u.id
      WHERE b.provider_id = ?
      ORDER BY a.date DESC, a.start_time DESC
    `).all(profile.id);
    return res.json(bookings);
  }

  // Default: sessions I've booked (works for all users)
  const bookings = db.prepare(`
    SELECT b.*, a.date, a.start_time, a.end_time,
           u.name as provider_name, pp.category, pp.price_per_session, pp.avatar_url,
           pp.id as provider_profile_id,
           r.id as review_id, r.rating as review_rating
    FROM bookings b
    JOIN availability a ON b.availability_id = a.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    JOIN users u ON pp.user_id = u.id
    LEFT JOIN reviews r ON r.booking_id = b.id
    WHERE b.student_id = ?
    ORDER BY a.date DESC, a.start_time DESC
  `).all(req.user.id);
  return res.json(bookings);
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { availability_id } = req.body;
    console.log('[BOOKING] POST by user', req.user.id, 'availability_id:', availability_id, typeof availability_id);

    if (!availability_id) return res.status(400).json({ error: 'availability_id required' });

    const slot = db.prepare('SELECT * FROM availability WHERE id = ?').get(availability_id);
    console.log('[BOOKING] slot lookup:', slot ? `found (provider_id=${slot.provider_id}, is_booked=${slot.is_booked})` : 'NOT FOUND');
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.is_booked) return res.status(400).json({ error: 'Slot already booked' });

    // Can't book your own slot
    const ownProfile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user.id);
    console.log('[BOOKING] ownProfile:', ownProfile ? `id=${ownProfile.id}` : 'none');
    if (ownProfile && ownProfile.id === slot.provider_id) {
      return res.status(400).json({ error: "You can't book your own slot" });
    }

    const existing = db.prepare(
      "SELECT id FROM bookings WHERE student_id = ? AND availability_id = ? AND status != 'cancelled'"
    ).get(req.user.id, availability_id);
    if (existing) return res.status(400).json({ error: 'Already booked' });

    const result = db.prepare(
      'INSERT INTO bookings (student_id, provider_id, availability_id) VALUES (?, ?, ?)'
    ).run(req.user.id, slot.provider_id, availability_id);
    console.log('[BOOKING] inserted booking id:', result.lastInsertRowid);

    db.prepare('UPDATE availability SET is_booked = 1 WHERE id = ?').run(availability_id);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);

    // Send email notifications (non-blocking)
    sendBookingEmails(booking, slot, req.user).catch(err =>
      console.error('[BOOKING] email error:', err.message)
    );

    res.json(booking);
  } catch (err) {
    console.error('[BOOKING] ERROR:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Booking failed — please try again.' });
  }
});

router.patch('/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (booking.student_id === req.user.id) {
    // Any user can cancel their own booking
    if (status !== 'cancelled') return res.status(400).json({ error: 'You can only cancel your own bookings' });
    db.prepare('UPDATE availability SET is_booked = 0 WHERE id = ?').run(booking.availability_id);
  } else {
    // Must be the provider on this booking
    const profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile || booking.provider_id !== profile.id) return res.status(403).json({ error: 'Forbidden' });
    if (!['confirmed', 'completed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  }

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

  // Email student when provider confirms
  if (status === 'confirmed') {
    try {
      const slot = db.prepare('SELECT * FROM availability WHERE id = ?').get(booking.availability_id);
      const student = db.prepare('SELECT email, name FROM users WHERE id = ?').get(booking.student_id);
      const provider = db.prepare(`
        SELECT u.name as provider_name FROM provider_profiles pp
        JOIN users u ON pp.user_id = u.id WHERE pp.id = ?
      `).get(booking.provider_id);
      if (student && provider && slot) {
        sendBookingConfirmation({
          studentEmail: student.email,
          studentName: student.name,
          providerName: provider.provider_name,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
        }).catch(err => console.error('[BOOKING CONFIRM] email error:', err.message));
      }
    } catch (e) { /* non-fatal */ }
  }

  res.json(updated);
});

export default router;
