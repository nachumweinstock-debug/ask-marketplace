import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { sendBookingNotification } from '../email.js';

const router = Router();

// POST /time-requests — student requests a time from a provider
router.post('/', requireAuth, async (req, res) => {
  const { provider_id, requested_date, requested_time, message } = req.body;
  if (!provider_id) return res.status(400).json({ error: 'provider_id required' });
  if (!requested_date) return res.status(400).json({ error: 'Date required' });
  if (!requested_time) return res.status(400).json({ error: 'Time required' });

  const provider = db.prepare(`
    SELECT pp.*, u.email as provider_email, u.name as provider_name
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.id = ?
  `).get(provider_id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  if (provider.user_id === req.user.id) return res.status(400).json({ error: "Can't request your own listing" });

  // Prevent spam: max 3 pending requests per student per provider
  const existing = db.prepare(
    "SELECT COUNT(*) as n FROM time_requests WHERE student_id = ? AND provider_id = ? AND status = 'pending'"
  ).get(req.user.id, provider_id);
  if (existing.n >= 3) return res.status(400).json({ error: 'You already have pending requests with this provider' });

  const result = db.prepare(`
    INSERT INTO time_requests (student_id, provider_id, requested_date, requested_time, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, provider_id, requested_date, requested_time, message?.slice(0, 300) || null);

  // Email notification to provider
  const student = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id);
  try {
    await sendBookingNotification({
      providerEmail: provider.provider_email,
      providerName: provider.provider_name,
      studentName: student.name,
      studentEmail: student.email,
      date: requested_date,
      startTime: requested_time,
      endTime: '',
    });
  } catch (err) {
    console.error('[time-request] email error:', err.message);
  }

  const row = db.prepare('SELECT * FROM time_requests WHERE id = ?').get(result.lastInsertRowid);
  res.json(row);
});

// GET /time-requests/mine — provider's incoming requests
router.get('/mine', requireAuth, (req, res) => {
  const requests = db.prepare(`
    SELECT tr.*, u.name as student_name, u.email as student_email,
           pp.title as listing_title, pp.category
    FROM time_requests tr
    JOIN users u ON tr.student_id = u.id
    JOIN provider_profiles pp ON tr.provider_id = pp.id
    WHERE pp.user_id = ?
    ORDER BY tr.created_at DESC
  `).all(req.user.id);
  res.json(requests);
});

// PATCH /time-requests/:id — provider accepts/declines
router.patch('/:id', requireAuth, (req, res) => {
  const tr = db.prepare(`
    SELECT tr.*, pp.user_id as provider_user_id
    FROM time_requests tr
    JOIN provider_profiles pp ON tr.provider_id = pp.id
    WHERE tr.id = ?
  `).get(req.params.id);
  if (!tr) return res.status(404).json({ error: 'Not found' });
  if (tr.provider_user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.prepare('UPDATE time_requests SET status = ? WHERE id = ?').run(status, tr.id);
  res.json({ ...tr, status });
});

export default router;
