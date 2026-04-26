import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';

const router = Router();

// GET /help-wanted — list all open requests (public)
router.get('/', optionalAuth, (req, res) => {
  const { category, search } = req.query;
  let query = `
    SELECT hw.*, u.name as user_name, u.avatar_url as user_avatar
    FROM help_wanted hw
    JOIN users u ON hw.user_id = u.id
    WHERE hw.status = 'open'
  `;
  const params = [];

  if (category && category !== 'all') {
    query += ' AND hw.category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (hw.title LIKE ? OR hw.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY hw.created_at DESC';
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// GET /help-wanted/mine — my requests
router.get('/mine', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM help_wanted WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(rows);
});

// POST /help-wanted — create a request
router.post('/', requireAuth, (req, res) => {
  const { title, description, category, budget, urgency } = req.body;
  if (!title || title.trim().length < 3) return res.status(400).json({ error: 'Title is required (min 3 chars)' });
  if (title.trim().length > 120) return res.status(400).json({ error: 'Title too long (max 120 chars)' });
  if (description && description.length > 1000) return res.status(400).json({ error: 'Description too long (max 1000 chars)' });
  if (budget && budget.length > 50) return res.status(400).json({ error: 'Budget too long' });

  const validUrgency = ['asap', 'this_week', 'flexible'].includes(urgency) ? urgency : 'flexible';

  const result = db.prepare(`
    INSERT INTO help_wanted (user_id, title, description, category, budget, urgency)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, title.trim(), description?.trim() || null, category || null, budget || null, validUrgency);

  const row = db.prepare('SELECT * FROM help_wanted WHERE id = ?').get(result.lastInsertRowid);
  res.json(row);
});

// PATCH /help-wanted/:id — update status (owner only)
router.patch('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM help_wanted WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { status } = req.body;
  if (!['open', 'filled', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.prepare('UPDATE help_wanted SET status = ? WHERE id = ?').run(status, row.id);
  res.json({ ...row, status });
});

// DELETE /help-wanted/:id — delete (owner only)
router.delete('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM help_wanted WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  db.prepare('DELETE FROM help_wanted WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

export default router;
