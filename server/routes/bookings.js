import { Router } from 'express';
import { createHmac } from 'crypto';
import db from '../db.js';
import { requireAuth } from '../auth.js';

// Deterministic token for a booking's ICS download — no DB column needed.
// Changing JWT_SECRET invalidates all existing links (fine — email links are short-lived anyway).
function icsToken(bookingId) {
  const secret = process.env.JWT_SECRET || 'dev-only-insecure-fallback-do-not-use-in-prod';
  return createHmac('sha256', secret).update(`ics-${bookingId}`).digest('hex').slice(0, 24);
}
import { sendBookingNotification, sendAdminBookingNotification, sendBookingConfirmation, sendProviderConfirmationCopy, sendCancellationNotification, sendBookingDeclinedNotification, sendRescheduleProposalEmail, sendRescheduleResponseEmail } from '../email.js';
import { buildICS, googleCalendarUrl } from '../calendar.js';
import { smsBookingRequest, smsBookingConfirmed } from '../sms.js';
import posthog from '../posthog.js';

const router = Router();

async function sendBookingEmails(booking, slot, student) {
  const providerInfo = db.prepare(`
    SELECT u.email, u.phone, u.name as provider_name,
           pp.title, pp.category, pp.custom_category, pp.subcategory
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.id = ?
  `).get(booking.provider_id);
  if (!providerInfo) return;

  const listingTitle = providerInfo.title || providerInfo.subcategory || providerInfo.custom_category || providerInfo.category || 'Service';
  const emailResults = await Promise.allSettled([
    sendBookingNotification({
      providerEmail: providerInfo.email,
      providerName: providerInfo.provider_name,
      studentName: student.name,
      studentEmail: student.email,
      date: slot.date,
      startTime: slot.start_time,
      endTime: slot.end_time,
    }),
    sendAdminBookingNotification({
      bookingId: booking.id,
      providerName: providerInfo.provider_name,
      providerEmail: providerInfo.email,
      studentName: student.name,
      studentEmail: student.email,
      date: slot.date,
      startTime: slot.start_time,
      endTime: slot.end_time,
      listingTitle,
      category: providerInfo.custom_category || providerInfo.category,
    }),
  ]);
  for (const result of emailResults) {
    if (result.status === 'rejected') {
      console.error('[BOOKING] email error:', result.reason?.message || result.reason);
    }
  }

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

  // Pending group invites
  const group_invites = db.prepare(
    "SELECT COUNT(*) as n FROM booking_group_invites WHERE invitee_id = ? AND status = 'pending'"
  ).get(req.user.id).n;

  res.json({ pending_bookings, dm_unread, group_invites, total: pending_bookings + dm_unread + group_invites });
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
           r.id as review_id, r.rating as review_rating,
           pa.date as reschedule_date, pa.start_time as reschedule_start_time, pa.end_time as reschedule_end_time
    FROM bookings b
    JOIN availability a ON b.availability_id = a.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    JOIN users u ON pp.user_id = u.id
    LEFT JOIN reviews r ON r.booking_id = b.id
    LEFT JOIN availability pa ON b.reschedule_proposed_availability_id = pa.id
    WHERE b.student_id = ?
    ORDER BY a.date DESC, a.start_time DESC
  `).all(req.user.id);
  return res.json(bookings);
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { availability_id, group_invite_ids } = req.body;
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

    // Group invites
    if (Array.isArray(group_invite_ids) && group_invite_ids.length > 0) {
      const student = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
      const providerUser = db.prepare(`SELECT u.name FROM provider_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.id = ?`).get(slot.provider_id);
      for (const invitee_id of group_invite_ids) {
        try {
          db.prepare('INSERT OR IGNORE INTO booking_group_invites (booking_id, inviter_id, invitee_id) VALUES (?, ?, ?)').run(result.lastInsertRowid, req.user.id, invitee_id);
          db.prepare('INSERT INTO direct_messages (sender_id, receiver_id, body, is_system) VALUES (?, ?, ?, 1)').run(
            req.user.id, invitee_id,
            `${student?.name} invited you to a group session with ${providerUser?.name} on ${slot.date} at ${slot.start_time}. Check your dashboard to accept.`
          );
        } catch (e) { console.error('[BOOKING] group invite error:', e.message); }
      }
    }

    // Send email notifications (non-blocking)
    sendBookingEmails(booking, slot, req.user).catch(err =>
      console.error('[BOOKING] email error:', err.message)
    );

    posthog.capture({
      distinctId: String(req.user.id),
      event: 'booking_created',
      properties: {
        booking_id: booking.id,
        provider_id: slot.provider_id,
        slot_date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        group_invite_count: group_invite_ids?.length || 0,
      },
    });

    res.json(booking);
  } catch (err) {
    console.error('[BOOKING] ERROR:', err.message, err.stack);
    posthog.captureException(err, String(req.user?.id));
    res.status(500).json({ error: err.message || 'Booking failed — please try again.' });
  }
});

// GET /bookings/group-invites/mine
router.get('/group-invites/mine', requireAuth, (req, res) => {
  const invites = db.prepare(`
    SELECT bgi.*,
           b.status as booking_status,
           a.date, a.start_time, a.end_time,
           inviter.name as inviter_name,
           pu.name as provider_name,
           pp.category, pp.custom_category
    FROM booking_group_invites bgi
    JOIN bookings b ON bgi.booking_id = b.id
    JOIN availability a ON b.availability_id = a.id
    JOIN users inviter ON bgi.inviter_id = inviter.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    JOIN users pu ON pp.user_id = pu.id
    WHERE bgi.invitee_id = ? AND bgi.status = 'pending'
    ORDER BY bgi.created_at DESC
  `).all(req.user.id);
  res.json(invites);
});

// POST /bookings/group-invites/:id/accept
router.post('/group-invites/:id/accept', requireAuth, (req, res) => {
  const invite = db.prepare('SELECT * FROM booking_group_invites WHERE id = ? AND invitee_id = ?').get(req.params.id, req.user.id);
  if (!invite) return res.status(404).json({ error: 'Invite not found' });
  if (invite.status !== 'pending') return res.status(400).json({ error: 'Already responded' });
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(invite.booking_id);
  if (!booking || booking.status === 'cancelled') return res.status(400).json({ error: 'Booking no longer available' });
  db.prepare("UPDATE booking_group_invites SET status = 'accepted' WHERE id = ?").run(invite.id);
  res.json({ ok: true });
});

// POST /bookings/group-invites/:id/decline
router.post('/group-invites/:id/decline', requireAuth, (req, res) => {
  const invite = db.prepare('SELECT * FROM booking_group_invites WHERE id = ? AND invitee_id = ?').get(req.params.id, req.user.id);
  if (!invite) return res.status(404).json({ error: 'Invite not found' });
  db.prepare("UPDATE booking_group_invites SET status = 'declined' WHERE id = ?").run(invite.id);
  res.json({ ok: true });
});

router.patch('/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  let cancelledByStudent = false;
  let cancelledByProvider = false;
  const wasStillPending = booking.status === 'pending';

  if (booking.student_id === req.user.id) {
    // Student can cancel (any status) or mark as completed (only from confirmed)
    if (status === 'cancelled') {
      db.prepare('UPDATE availability SET is_booked = 0 WHERE id = ?').run(booking.availability_id);
      cancelledByStudent = true;
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
      cancelledByProvider = true;
    }
  }

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

  const eventName = status === 'confirmed' ? 'booking_confirmed'
    : status === 'completed' ? 'booking_completed'
    : 'booking_cancelled';
  posthog.capture({
    distinctId: String(req.user.id),
    event: eventName,
    properties: {
      booking_id: booking.id,
      provider_id: booking.provider_id,
      cancelled_by: cancelledByStudent ? 'student' : cancelledByProvider ? 'provider' : undefined,
    },
  });

  // Email on cancellation / decline
  if (cancelledByStudent || cancelledByProvider) {
    try {
      const slot = db.prepare('SELECT * FROM availability WHERE id = ?').get(booking.availability_id);
      const student = db.prepare('SELECT email, name FROM users WHERE id = ?').get(booking.student_id);
      const providerInfo = db.prepare(`
        SELECT u.email, u.name, pp.category, pp.custom_category FROM provider_profiles pp
        JOIN users u ON pp.user_id = u.id WHERE pp.id = ?
      `).get(booking.provider_id);

      if (slot && student && providerInfo) {
        if (cancelledByStudent) {
          sendCancellationNotification({
            toEmail: providerInfo.email, toName: providerInfo.name,
            otherName: student.name,
            date: slot.date, startTime: slot.start_time, endTime: slot.end_time,
            role: 'provider',
          }).catch(() => {});
        } else if (wasStillPending) {
          // Provider declined a pending request — send declined email with rebook CTA
          sendBookingDeclinedNotification({
            studentEmail: student.email, studentName: student.name,
            providerName: providerInfo.name,
            date: slot.date, startTime: slot.start_time, endTime: slot.end_time,
            category: providerInfo.custom_category || providerInfo.category,
          }).catch(() => {});
        } else {
          // Provider cancelled a confirmed booking
          sendCancellationNotification({
            toEmail: student.email, toName: student.name,
            otherName: providerInfo.name,
            date: slot.date, startTime: slot.start_time, endTime: slot.end_time,
            role: 'student',
            rebookUrl: 'https://uask.live/browse',
          }).catch(() => {});
        }
      }
    } catch { /* non-fatal */ }
  }

  // Email student when provider confirms
  if (status === 'confirmed') {
    try {
      const slot = db.prepare('SELECT * FROM availability WHERE id = ?').get(booking.availability_id);
      const student = db.prepare('SELECT email, name, phone FROM users WHERE id = ?').get(booking.student_id);
      const provider = db.prepare(`
        SELECT u.name as provider_name, u.zelle, u.venmo FROM provider_profiles pp
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
          icsToken: icsToken(booking.id),
          zelleHandle: provider.zelle || null,
          venmoHandle: provider.venmo || null,
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
            icsToken: icsToken(booking.id),
          }).catch(err => console.error('[BOOKING CONFIRM] provider email error:', err.message));
        }
      }
    } catch { /* non-fatal */ }
  }

  res.json(updated);
});

// GET /bookings/:id/ics — download .ics file for Apple Calendar / Outlook
// Protected with a signed HMAC token included in confirmation emails.
router.get('/:id/ics', (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, a.date, a.start_time, a.end_time,
           u.name as provider_name,
           pp.session_type,
           pp.title as listing_title,
           pp.subcategory,
           pp.custom_category,
           pp.category
    FROM bookings b
    JOIN availability a ON b.availability_id = a.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    JOIN users u ON pp.user_id = u.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const expected = icsToken(booking.id);
  if (!req.query.token || req.query.token !== expected) {
    return res.status(403).json({ error: 'Invalid or missing download token' });
  }

  // Show provider title if ?for=provider is passed (used in provider confirmation email)
  const isProviderDownload = req.query.for === 'provider';
  const student = db.prepare('SELECT name FROM users WHERE id = ?').get(booking.student_id);
  const title = isProviderDownload
    ? `Session with ${student?.name || 'Student'}`
    : `Session with ${booking.provider_name}`;
  const listing = booking.listing_title || booking.subcategory || booking.custom_category || booking.category || 'Instruction';
  const sessionLine = ['zoom', 'both'].includes(booking.session_type)
    ? 'Session link: coordinate the online meeting link in Ask Messages.'
    : 'Meeting details: coordinate the meeting place in Ask Messages.';

  const icsContent = buildICS({
    title,
    description: `Booked through Ask Marketplace.\n\nListing: ${listing}\n${sessionLine}\nNotes: Bring class materials, questions, and any assignment details you want to review.`,
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
           su.name as student_name,
           pp.session_type,
           pp.title as listing_title,
           pp.subcategory,
           pp.custom_category,
           pp.category
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
  const listing = booking.listing_title || booking.subcategory || booking.custom_category || booking.category || 'Instruction';
  const sessionLine = ['zoom', 'both'].includes(booking.session_type)
    ? 'Session link: coordinate the online meeting link in Ask Messages.'
    : 'Meeting details: coordinate the meeting place in Ask Messages.';
  const description = `Booked through Ask Marketplace.\n\nListing: ${listing}\n${sessionLine}\nNotes: Bring class materials, questions, and any assignment details you want to review.`;

  res.json({
    google: googleCalendarUrl({ title, description, slotDate: booking.date, startTime: booking.start_time, endTime: booking.end_time }),
    ics: `/api/bookings/${booking.id}/ics?token=${icsToken(booking.id)}`,
    title,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
  });
});

// POST /bookings/:id/reschedule — provider proposes a new time slot
router.post('/:id/reschedule', requireAuth, async (req, res) => {
  try {
    const { new_availability_id } = req.body;
    if (!new_availability_id) return res.status(400).json({ error: 'new_availability_id required' });

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Can only reschedule confirmed bookings' });

    const isOwner = db.prepare('SELECT 1 FROM provider_profiles WHERE user_id = ? AND id = ?')
      .get(req.user.id, booking.provider_id);
    if (!isOwner) return res.status(403).json({ error: 'Forbidden' });

    const newSlot = db.prepare('SELECT * FROM availability WHERE id = ?').get(new_availability_id);
    if (!newSlot) return res.status(404).json({ error: 'Proposed slot not found' });
    if (newSlot.is_booked) return res.status(400).json({ error: 'That slot is already booked' });
    if (newSlot.provider_id !== booking.provider_id) return res.status(400).json({ error: 'Slot does not belong to your listing' });
    if (String(newSlot.id) === String(booking.availability_id)) return res.status(400).json({ error: 'That is already the current slot' });

    db.prepare(`
      UPDATE bookings SET
        reschedule_proposed_availability_id = ?,
        reschedule_proposed_by = 'provider',
        reschedule_status = 'pending_student_approval'
      WHERE id = ?
    `).run(new_availability_id, booking.id);

    const originalSlot = db.prepare('SELECT * FROM availability WHERE id = ?').get(booking.availability_id);
    const student = db.prepare('SELECT email, name FROM users WHERE id = ?').get(booking.student_id);
    const providerUser = db.prepare(`
      SELECT u.name FROM provider_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.id = ?
    `).get(booking.provider_id);

    if (student && providerUser && originalSlot) {
      sendRescheduleProposalEmail({
        studentEmail: student.email, studentName: student.name,
        providerName: providerUser.name,
        originalDate: originalSlot.date, originalStart: originalSlot.start_time, originalEnd: originalSlot.end_time,
        newDate: newSlot.date, newStart: newSlot.start_time, newEnd: newSlot.end_time,
      }).catch(() => {});
    }

    res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id));
  } catch (err) {
    console.error('[RESCHEDULE] propose error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /bookings/:id/reschedule/accept — student accepts the proposed reschedule
router.post('/:id/reschedule/accept', requireAuth, async (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.student_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (booking.reschedule_status !== 'pending_student_approval') return res.status(400).json({ error: 'No pending reschedule proposal' });

    const newSlot = db.prepare('SELECT * FROM availability WHERE id = ?').get(booking.reschedule_proposed_availability_id);
    if (!newSlot) return res.status(404).json({ error: 'Proposed slot no longer available' });

    // Free old slot, claim new slot
    db.prepare('UPDATE availability SET is_booked = 0 WHERE id = ?').run(booking.availability_id);
    db.prepare('UPDATE availability SET is_booked = 1 WHERE id = ?').run(newSlot.id);
    db.prepare(`
      UPDATE bookings SET
        availability_id = ?,
        reschedule_proposed_availability_id = NULL,
        reschedule_proposed_by = NULL,
        reschedule_status = 'none'
      WHERE id = ?
    `).run(newSlot.id, booking.id);

    const providerUser = db.prepare(`
      SELECT u.email, u.name FROM provider_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.id = ?
    `).get(booking.provider_id);
    const student = db.prepare('SELECT name FROM users WHERE id = ?').get(booking.student_id);

    if (providerUser && student) {
      sendRescheduleResponseEmail({
        providerEmail: providerUser.email, providerName: providerUser.name,
        studentName: student.name, accepted: true,
        newDate: newSlot.date, newStart: newSlot.start_time, newEnd: newSlot.end_time,
      }).catch(() => {});
    }

    res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id));
  } catch (err) {
    console.error('[RESCHEDULE] accept error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /bookings/:id/reschedule/decline — student declines the proposed reschedule
router.post('/:id/reschedule/decline', requireAuth, async (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.student_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (booking.reschedule_status !== 'pending_student_approval') return res.status(400).json({ error: 'No pending reschedule proposal' });

    db.prepare(`
      UPDATE bookings SET
        reschedule_proposed_availability_id = NULL,
        reschedule_proposed_by = NULL,
        reschedule_status = 'none'
      WHERE id = ?
    `).run(booking.id);

    const providerUser = db.prepare(`
      SELECT u.email, u.name FROM provider_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.id = ?
    `).get(booking.provider_id);
    const student = db.prepare('SELECT name FROM users WHERE id = ?').get(booking.student_id);

    if (providerUser && student) {
      sendRescheduleResponseEmail({
        providerEmail: providerUser.email, providerName: providerUser.name,
        studentName: student.name, accepted: false,
        newDate: null, newStart: null, newEnd: null,
      }).catch(() => {});
    }

    res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id));
  } catch (err) {
    console.error('[RESCHEDULE] decline error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
