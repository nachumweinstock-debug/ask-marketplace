import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { sendBookingNotification, sendBookingConfirmation, sendProviderConfirmationCopy } from '../email.js';

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

// GET /bookings/notifications — unread counts for the navbar badge
router.get('/notifications', requireAuth, (req, res) => {
  // Pending bookings for providers (waiting to confirm)
  const profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user.id);
  const pending_bookings = profile
    ? db.prepare("SELECT COUNT(*) as n FROM bookings WHERE provider_id = ? AND status = 'pending'").get(profile.id).n
    : 0;

  // Unread DMs
  const dm_unread = db.prepare(
    'SELECT COUNT(*) as n FROM direct_messages WHERE receiver_id = ? AND read_at IS NULL'
  ).get(req.user.id).n;

  res.json({ pending_bookings, dm_unread, total: pending_bookings + dm_unread });
});

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

    // Auto-send a DM from student to provider so both have a message thread
    try {
      const providerInfo = db.prepare(`
        SELECT u.id as user_id, u.name, pp.category, pp.custom_category
        FROM provider_profiles pp
        JOIN users u ON pp.user_id = u.id
        WHERE pp.id = ?
      `).get(slot.provider_id);

      if (providerInfo && providerInfo.user_id !== req.user.id) {
        const catLabel = providerInfo.custom_category || providerInfo.category || 'session';
        const msg = `Hey ${providerInfo.name.split(' ')[0]}! I just booked your ${catLabel} slot for ${slot.date} at ${slot.start_time}–${slot.end_time}. Looking forward to it!`;
        db.prepare('INSERT INTO direct_messages (sender_id, receiver_id, body) VALUES (?, ?, ?)')
          .run(req.user.id, providerInfo.user_id, msg);
        console.log('[BOOKING] auto-DM sent from', req.user.id, 'to', providerInfo.user_id);
      }
    } catch (dmErr) {
      console.error('[BOOKING] auto-DM error:', dmErr.message);
    }

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
    // Student can cancel (any status) or mark as completed (only from confirmed)
    if (status === 'cancelled') {
      db.prepare('UPDATE availability SET is_booked = 0 WHERE id = ?').run(booking.availability_id);
    } else if (status === 'completed') {
      if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Can only mark a confirmed booking as done' });
    } else {
      return res.status(400).json({ error: 'Invalid status change' });
    }
  } else {
    // Must be the provider on this booking
    const profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile || booking.provider_id !== profile.id) return res.status(403).json({ error: 'Forbidden' });
    if (!['confirmed', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (status === 'cancelled') {
      db.prepare('UPDATE availability SET is_booked = 0 WHERE id = ?').run(booking.availability_id);
    }
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
        }).catch(err => console.error('[BOOKING CONFIRM] student email error:', err.message));

        // Also send a confirmation copy + reminder to the provider
        const providerUser = db.prepare(`
          SELECT u.email FROM provider_profiles pp
          JOIN users u ON pp.user_id = u.id WHERE pp.id = ?
        `).get(booking.provider_id);
        if (providerUser) {
          sendProviderConfirmationCopy({
            providerEmail: providerUser.email,
            providerName: provider.provider_name,
            studentName: student.name,
            studentEmail: student.email,
            date: slot.date,
            startTime: slot.start_time,
            endTime: slot.end_time,
          }).catch(err => console.error('[BOOKING CONFIRM] provider email error:', err.message));
        }
      }
    } catch (e) { /* non-fatal */ }
  }

  res.json(updated);
});

export default router;
