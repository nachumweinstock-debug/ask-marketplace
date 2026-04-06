import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.get('/:providerId', (req, res) => {
  const slots = db.prepare(
    'SELECT * FROM availability WHERE provider_id = ? AND date >= date("now") ORDER BY date, start_time'
  ).all(req.params.providerId);
  res.json(slots);
});

router.post('/', requireAuth, (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ error: 'Providers only' });
  const profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No profile found' });

  const { date, start_time, end_time } = req.body;
  if (!date || !start_time || !end_time) return res.status(400).json({ error: 'date, start_time, end_time required' });

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
