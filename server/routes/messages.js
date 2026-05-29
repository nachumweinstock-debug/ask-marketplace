import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { pushNewMessage } from '../push.js';

const router = Router();

// Verify the requester is one of the two parties on this booking
function getBookingParties(bookingId) {
  return db.prepare(`
    SELECT b.id, b.student_id, pp.user_id as provider_user_id,
           u_s.name as student_name, u_p.name as provider_name,
           a.date, a.start_time, a.end_time, pp.category, pp.custom_category,
           pp.id as provider_profile_id
    FROM bookings b
    JOIN availability a ON b.availability_id = a.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    JOIN users u_s ON b.student_id = u_s.id
    JOIN users u_p ON pp.user_id = u_p.id
    WHERE b.id = ?
  `).get(bookingId);
}

// GET /messages/unread — count of bookings with unread messages for the current user
router.get('/unread', requireAuth, (req, res) => {
  const count = db.prepare(`
    SELECT COUNT(DISTINCT m.booking_id) as n
    FROM messages m
    JOIN bookings b ON m.booking_id = b.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    WHERE m.sender_id != ?
      AND m.read_at IS NULL
      AND (b.student_id = ? OR pp.user_id = ?)
  `).get(req.user.id, req.user.id, req.user.id);
  res.json({ count: count.n });
});

// GET /messages/booking/:bookingId — fetch conversation; marks incoming messages as read
router.get('/booking/:bookingId', requireAuth, (req, res) => {
  const booking = getBookingParties(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.student_id !== req.user.id && booking.provider_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Mark messages sent by the other party as read
  db.prepare(`
    UPDATE messages SET read_at = CURRENT_TIMESTAMP
    WHERE booking_id = ? AND sender_id != ? AND read_at IS NULL
  `).run(req.params.bookingId, req.user.id);

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.booking_id = ?
    ORDER BY m.created_at ASC
  `).all(req.params.bookingId);

  res.json({ booking, messages });
});

// POST /messages/booking/:bookingId — send a message
router.post('/booking/:bookingId', requireAuth, (req, res) => {
  const booking = getBookingParties(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.student_id !== req.user.id && booking.provider_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Message body required' });

  const result = db.prepare(
    'INSERT INTO messages (booking_id, sender_id, body) VALUES (?, ?, ?)'
  ).run(req.params.bookingId, req.user.id, body.trim());

  const msg = db.prepare(`
    SELECT m.*, u.name as sender_name
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  // Push to the other party
  const recipientId = booking.student_id === req.user.id ? booking.provider_user_id : booking.student_id;
  pushNewMessage(recipientId, {
    senderName: req.user.name,
    preview: body.trim(),
    bookingId: req.params.bookingId,
  }).catch(() => {});

  res.json(msg);
});

// GET /messages/conversations — all bookings with their latest message + unread flag
router.get('/conversations', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT b.id as booking_id, b.student_id, b.status,
           pp.user_id as provider_user_id, pp.id as provider_profile_id,
           pp.category, pp.custom_category,
           u_s.name as student_name, u_p.name as provider_name,
           a.date, a.start_time, a.end_time,
           m.body as last_message, m.created_at as last_message_at, m.sender_id as last_sender_id,
           (
             SELECT COUNT(*) FROM messages m2
             WHERE m2.booking_id = b.id AND m2.sender_id != ? AND m2.read_at IS NULL
           ) as unread
    FROM bookings b
    JOIN availability a ON b.availability_id = a.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    JOIN users u_s ON b.student_id = u_s.id
    JOIN users u_p ON pp.user_id = u_p.id
    LEFT JOIN messages m ON m.id = (
      SELECT id FROM messages WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1
    )
    WHERE (b.student_id = ? OR pp.user_id = ?)
      AND b.status != 'cancelled'
    ORDER BY COALESCE(m.created_at, b.created_at) DESC
  `).all(req.user.id, req.user.id, req.user.id);

  res.json(rows);
});

export default router;
