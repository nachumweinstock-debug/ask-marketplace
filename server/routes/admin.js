import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function requireAdmin(req, res, next) {
  const u = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!u?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// POST /api/admin/bootstrap — grant admin using the ADMIN_SECRET env var
// Used to set up the first admin accounts
router.post('/bootstrap', (req, res) => {
  const { email, secret } = req.body;
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET) return res.status(503).json({ error: 'ADMIN_SECRET not configured on server' });
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Invalid secret' });

  const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email?.toLowerCase());
  if (!user) return res.status(404).json({ error: 'No account found for that email. Sign up first.' });

  db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);
  res.json({ ok: true, message: `${user.name} (${user.email}) is now an admin.` });
});

// GET /api/admin/users — list all users
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.is_admin, u.created_at,
           pp.rating, pp.review_count, pp.category, pp.custom_category
    FROM users u
    LEFT JOIN provider_profiles pp ON pp.user_id = u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

// PATCH /api/admin/users/:id — toggle admin, change role etc.
router.patch('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { is_admin, role } = req.body;
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (is_admin !== undefined) db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(is_admin ? 1 : 0, req.params.id);
  if (role !== undefined)     db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);

  res.json(db.prepare('SELECT id, email, name, role, is_admin FROM users WHERE id = ?').get(req.params.id));
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// GET /api/admin/stats
router.get('/stats', requireAuth, requireAdmin, (req, res) => {
  const stats = {
    users:     db.prepare('SELECT COUNT(*) as n FROM users').get().n,
    providers: db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'provider'").get().n,
    bookings:  db.prepare('SELECT COUNT(*) as n FROM bookings').get().n,
    reviews:   db.prepare('SELECT COUNT(*) as n FROM reviews').get().n,
  };
  res.json(stats);
});

export default router;
