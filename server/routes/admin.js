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
           pp.id as provider_profile_id, pp.rating, pp.review_count, pp.category, pp.custom_category
    FROM users u
    LEFT JOIN provider_profiles pp ON pp.user_id = u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

// DELETE /api/admin/listings/:profileId — delete a provider listing only (keeps user account)
router.delete('/listings/:profileId', requireAuth, requireAdmin, (req, res) => {
  const profile = db.prepare('SELECT id, user_id FROM provider_profiles WHERE id = ?').get(req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'Listing not found' });
  db.prepare('DELETE FROM provider_profiles WHERE id = ?').run(profile.id);
  db.prepare("UPDATE users SET role = 'student' WHERE id = ?").run(profile.user_id);
  res.json({ ok: true });
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

// POST /api/admin/import — bulk-create provider listings from a JSON array
// Each item: { email, name?, category?, custom_category?, bio?, price_per_session?, zelle?, venmo? }
router.post('/import', requireAuth, requireAdmin, (req, res) => {
  const { providers } = req.body;
  if (!Array.isArray(providers) || providers.length === 0) {
    return res.status(400).json({ error: 'providers array required' });
  }

  const VALID_CATS = ['tutor', 'barber', 'hebrew tutor', 'tennis', 'other'];
  const results = [];

  // Wrap each row in its own transaction so one bad row doesn't block others
  const importOne = db.transaction(p => {
    const email = p.email?.toLowerCase().trim();
    if (!email || !email.includes('@')) throw new Error('Invalid email');

    const name         = p.name?.trim()           || email.split('@')[0];
    const category     = VALID_CATS.includes(p.category?.toLowerCase())
                           ? p.category.toLowerCase() : 'other';
    const custom_cat   = p.custom_category?.trim() || null;
    const bio          = p.bio?.trim()             || null;
    const price        = parseFloat(p.price_per_session) || 0;
    const zelle        = p.zelle?.trim()           || null;
    const venmo        = p.venmo?.trim()            || null;

    // Find or create the user row
    let user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    let action;
    if (!user) {
      const r = db.prepare(
        "INSERT INTO users (email, name, password, role, email_verified) VALUES (?, ?, '', 'provider', 1)"
      ).run(email, name);
      user = { id: r.lastInsertRowid };
      action = 'created';
    } else {
      db.prepare("UPDATE users SET role = 'provider', name = CASE WHEN ? != '' THEN ? ELSE name END WHERE id = ?")
        .run(p.name?.trim() || '', p.name?.trim() || '', user.id);
      action = 'updated';
    }

    // Create or update provider profile
    const existing = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(user.id);
    if (!existing) {
      db.prepare(
        'INSERT INTO provider_profiles (user_id, category, custom_category, bio, price_per_session, zelle, venmo) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(user.id, category, custom_cat, bio, price, zelle, venmo);
    } else {
      db.prepare(
        'UPDATE provider_profiles SET category=?, custom_category=?, bio=?, price_per_session=?, zelle=?, venmo=? WHERE user_id=?'
      ).run(category, custom_cat, bio, price, zelle, venmo, user.id);
    }

    return { email, name, action };
  });

  for (const p of providers) {
    try {
      const r = importOne(p);
      results.push({ ...r, status: 'ok' });
    } catch (err) {
      results.push({ email: p.email || '(missing)', status: 'error', error: err.message });
    }
  }

  res.json({
    results,
    imported: results.filter(r => r.status === 'ok').length,
    errors:   results.filter(r => r.status === 'error').length,
  });
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
