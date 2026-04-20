import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { sendBookingNotification, sendBookingConfirmation, sendProviderConfirmationCopy } from '../email.js';
import { buildICS, googleCalendarUrl } from '../calendar.js';
import { smsBookingRequest, smsBookingConfirmed } from '../sms.js';

const router = Router();

async function sendBookingEmails(booking, slot, student) {
  const providerInfo = db.prepare(`
    SELECT u.email, u.phone, u.name as provider_name
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

  // SMS to provider
  smsBookingRequest({
    phone: providerInfo.phone,
    studentName: student.name,
    date: slot.date,
    startTime: slot.start_time,
  }).catch(() => {});
}

// GET /bookings/notifications — unread counts for the navbar badge
router.get('/notifications', requireAuth, (req, res) => {
  // Pending bookings across ALL of the user's listings
  const pending_bookings = db.prepare(`
    SELECT COUNT(*) as n FROM bookings b
    JOIN provider_profiles pp ON b.provider_id = pp.id
    WHERE pp.user_id = ? AND b.status = 'pending'
  `).get(req.user.id).n;

  // Unread DMs
  const dm_unread = db.prepare(
    'SELECT COUNT(*) as n FROM direct_messages WHERE receiver_id = ? AND read_at IS NULL'
  ).get(req.user.id).n;

  res.json({ pending_bookings, dm_unread, total: pending_bookings + dm_unread });
});

router.get('/mine', requireAuth, (req, res) => {
  // Provider view: sessions booked with me — across all listings
  if (req.query.as === 'provider') {
    const bookings = db.prepare(`
      SELECT b.*, a.date, a.start_time, a.end_time,
             u.name as student_name, u.email as student_email,
             pp.category, pp.custom_category, pp.title as listing_title
      FROM bookings b
      JOIN availability a ON b.availability_id = a.id
      JOIN users u ON b.student_id = u.id
      JOIN provider_profiles pp ON b.provider_id = pp.id
      WHERE pp.user_id = ?
      ORDER BY a.date DESC, a.start_time DESC
    `).all(req.user.id);
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

    // Can't book your own slot (check all of the student's listings)
    const isOwnSlot = db.prepare(
      'SELECT 1 FROM provider_profiles WHERE user_id = ? AND id = ?'
    ).get(req.user.id, slot.provider_id);
    console.log('[BOOKING] isOwnSlot:', !!isOwnSlot);
    if (isOwnSlot) return res.status(400).json({ error: "You can't book your own slot" });

    const existing = db.prepare(
      "SELECT id FROM bookings WHERE student_id = ? AND availability_id = ? AND status != 'cancelled'"
    ).get(req.user.id, availability_id);
    if (existing) return res.status(400).json({ error: 'Already booked' });

    // Cross-listing conflict check: provider must be free on ALL their listings at this time
    const providerUserId = db.prepare(
      'SELECT user_id FROM provider_profiles WHERE id = ?'
    ).get(slot.provider_id)?.user_id;
    if (providerUserId) {
      const conflict = db.prepare(`
        SELECT 1
        FROM availability a
        JOIN provider_profiles pp ON a.provider_id = pp.id
        JOIN bookings b ON b.availability_id = a.id
        WHERE pp.user_id = ?
          AND a.date = ?
          AND a.start_time < ?
          AND a.end_time > ?
          AND b.status NOT IN ('cancelled')
      `).get(providerUserId, slot.date, slot.end_time, slot.start_time);
      if (conflict) return res.status(400).json({ error: 'Provider is already booked at this time' });
    }

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
        // Include student contact info if they have a phone number saved
        const studentContact = db.prepare('SELECT phone, contact_pref FROM users WHERE id = ?').get(req.user.id);
        let contactLine = '';
        if (studentContact?.phone) {
          const app = studentContact.contact_pref === 'whatsapp' ? 'WhatsApp' : 'iMessage';
          contactLine = ` You can reach me at ${studentContact.phone} on ${app}.`;
        }
        const msg = `Hey ${providerInfo.name.split(' ')[0]}! I just booked your ${catLabel} slot for ${slot.date} at ${slot.start_time}–${slot.end_time}.${contactLine} Looking forward to it!`;
        db.prepare('INSERT INTO direct_messages (sender_id, receiver_id, body, is_system) VALUES (?, ?, ?, 1)')
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
    // Must be the provider on this booking (check all their listings)
    const isOwner = db.prepare(
      'SELECT 1 FROM provider_profiles WHERE user_id = ? AND id = ?'
    ).get(req.user.id, booking.provider_id);
    if (!isOwner) return res.status(403).json({ error: 'Forbidden' });
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
      const student = db.prepare('SELECT email, name, phone FROM users WHERE id = ?').get(booking.student_id);
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
          bookingId: booking.id,
        }).catch(err => console.error('[BOOKING CONFIRM] student email error:', err.message));

        // SMS to student
        smsBookingConfirmed({
          phone: student.phone,
          providerName: provider.provider_name,
          date: slot.date,
          startTime: slot.start_time,
        }).catch(() => {});

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
            bookingId: booking.id,
          }).catch(err => console.error('[BOOKING CONFIRM] provider email error:', err.message));
        }
      }
    } catch (e) { /* non-fatal */ }
  }

  res.json(updated);
});

// GET /bookings/:id/ics — download .ics file for Apple Calendar / Outlook
// No auth required — link is clicked from email; booking ID is not publicly guessable
router.get('/:id/ics', (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, a.date, a.start_time, a.end_time,
           u.name as provider_name
    FROM bookings b
    JOIN availability a ON b.availability_id = a.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    JOIN users u ON pp.user_id = u.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Show provider title if ?for=provider is passed (used in provider confirmation email)
  const isProviderDownload = req.query.for === 'provider';
  const student = db.prepare('SELECT name FROM users WHERE id = ?').get(booking.student_id);
  const title = isProviderDownload
    ? `Session with ${student?.name || 'Student'}`
    : `Session with ${booking.provider_name}`;

  const icsContent = buildICS({
    title,
    description: `Booked via uask.live`,
    slotDate: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    uid: `booking-${booking.id}@uask.live`,
    url: 'https://uask.live/dashboard/student',
  });

  res.setHeader('Content-Type', 'text/calendar; charset=UTF-8');
  res.setHeader('Content-Disposition', 'attachment; filename="session.ics"');
  res.send(icsContent);
});

// GET /bookings/:id/calendar — returns Google Calendar URL + ICS URL for the frontend button
// Works for both student and provider
router.get('/:id/calendar', requireAuth, (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, a.date, a.start_time, a.end_time,
           pu.name as provider_name,
           su.name as student_name
    FROM bookings b
    JOIN availability a ON b.availability_id = a.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    JOIN users pu ON pp.user_id = pu.id
    JOIN users su ON b.student_id = su.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const isStudent = booking.student_id === req.user.id;
  const isProvider = !!db.prepare('SELECT 1 FROM provider_profiles WHERE user_id = ? AND id = ?').get(req.user.id, booking.provider_id);
  if (!isStudent && !isProvider) return res.status(403).json({ error: 'Forbidden' });

  const title = isProvider && !isStudent
    ? `Session with ${booking.student_name}`
    : `Session with ${booking.provider_name}`;
  const description = `Booked via uask.live`;

  res.json({
    google: googleCalendarUrl({ title, description, slotDate: booking.date, startTime: booking.start_time, endTime: booking.end_time }),
    ics: `/api/bookings/${booking.id}/ics`,
    title,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
  });
});

export default router;
