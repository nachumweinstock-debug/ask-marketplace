import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const DAY_ORDER = `CASE date
  WHEN 'Monday'    THEN 1
  WHEN 'Tuesday'   THEN 2
  WHEN 'Wednesday' THEN 3
  WHEN 'Thursday'  THEN 4
  WHEN 'Friday'    THEN 5
  WHEN 'Saturday'  THEN 6
  WHEN 'Sunday'    THEN 7
  ELSE 8 END`;

router.get('/:providerId', (req, res) => {
  const slots = db.prepare(
    `SELECT * FROM availability WHERE provider_id = ? AND is_booked = 0 ORDER BY ${DAY_ORDER}, start_time`
  ).all(req.params.providerId);
  res.json(slots);
});

router.post('/', requireAuth, (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ error: 'Providers only' });

  const { date, start_time, end_time, provider_id } = req.body;

  // If provider_id supplied, verify ownership; otherwise fall back to most recent profile
  let profile;
  if (provider_id) {
    profile = db.prepare('SELECT id FROM provider_profiles WHERE id = ? AND user_id = ?').get(provider_id, req.user.id);
    if (!profile) return res.status(404).json({ error: 'Listing not found' });
  } else {
    profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
    if (!profile) return res.status(404).json({ error: 'No profile found' });
  }

  if (!date || !start_time || !end_time) return res.status(400).json({ error: 'date, start_time, end_time required' });
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  if (!DAYS.includes(date)) return res.status(400).json({ error: 'date must be a day name (Monday–Sunday)' });
  if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) return res.status(400).json({ error: 'times must be HH:MM format' });
  if (start_time >= end_time) return res.status(400).json({ error: 'end_time must be after start_time' });

  const result = db.prepare(
    'INSERT INTO availability (provider_id, date, start_time, end_time) VALUES (?, ?, ?, ?)'
  ).run(profile.id, date, start_time, end_time);

  res.json(db.prepare('SELECT * FROM availability WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ error: 'Providers only' });
  const profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user.id);
  const slot = db.prepare('SELECT * FROM availability WHERE id = ?').get(req.params.id);
  if (!slot || slot.provider_id !== profile.id) return res.status(404).json({ error: 'Slot not found' });
  if (slot.is_booked) return res.status(400).json({ error: 'Cannot delete booked slot' });
  db.prepare('DELETE FROM availability WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
