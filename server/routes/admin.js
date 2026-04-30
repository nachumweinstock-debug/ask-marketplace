import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { sendVerificationCode, emailConfigStatus } from '../email.js';

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

// GET /api/admin/users — list all users (one row per user, most recent listing only)
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.is_admin, u.created_at,
           pp.id as provider_profile_id, pp.rating, pp.review_count, pp.category, pp.custom_category
    FROM users u
    LEFT JOIN (
      SELECT * FROM provider_profiles
      WHERE id IN (SELECT MAX(id) FROM provider_profiles GROUP BY user_id)
    ) pp ON pp.user_id = u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

// GET /api/admin/duplicates — users with the same name (likely duplicate accounts)
router.get('/duplicates', requireAuth, requireAdmin, (req, res) => {
  const groups = db.prepare(`
    SELECT LOWER(TRIM(name)) as normalized_name, COUNT(*) as count
    FROM users
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `).all();

  const result = groups.map(g => {
    const accounts = db.prepare(`
      SELECT u.id, u.email, u.name, u.role, u.created_at,
             COUNT(b_student.id) as bookings_as_student,
             COUNT(b_provider.id) as bookings_as_provider,
             COUNT(dm.id) as messages_sent
      FROM users u
      LEFT JOIN bookings b_student ON b_student.student_id = u.id
      LEFT JOIN provider_profiles pp ON pp.user_id = u.id
      LEFT JOIN bookings b_provider ON b_provider.provider_id = pp.id
      LEFT JOIN direct_messages dm ON dm.sender_id = u.id AND dm.is_system = 0
      WHERE LOWER(TRIM(u.name)) = ?
      GROUP BY u.id
      ORDER BY u.created_at ASC
    `).all(g.normalized_name);
    return { name: accounts[0]?.name || g.normalized_name, count: g.count, accounts };
  });

  res.json(result);
});

// DELETE /api/admin/users/:id/merge-into/:targetId — move all data from one account to another then delete it
router.post('/users/:id/merge-into/:targetId', requireAuth, requireAdmin, (req, res) => {
  const { id, targetId } = req.params;
  if (id === targetId) return res.status(400).json({ error: 'Cannot merge account into itself' });

  const source = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!source) return res.status(404).json({ error: 'Source user not found' });
  if (!target) return res.status(404).json({ error: 'Target user not found' });

  try {
    db.transaction(() => {
      // Reassign all content from source → target
      db.prepare('UPDATE bookings SET student_id = ? WHERE student_id = ?').run(targetId, id);
      db.prepare('UPDATE provider_profiles SET user_id = ? WHERE user_id = ?').run(targetId, id);
      db.prepare('UPDATE direct_messages SET sender_id = ? WHERE sender_id = ?').run(targetId, id);
      db.prepare('UPDATE direct_messages SET receiver_id = ? WHERE receiver_id = ?').run(targetId, id);
      db.prepare('UPDATE connections SET requester_id = ? WHERE requester_id = ? AND NOT EXISTS (SELECT 1 FROM connections WHERE requester_id = ? AND receiver_id = connections.receiver_id)').run(targetId, id, targetId);
      db.prepare('UPDATE connections SET receiver_id = ? WHERE receiver_id = ? AND NOT EXISTS (SELECT 1 FROM connections WHERE receiver_id = ? AND requester_id = connections.requester_id)').run(targetId, id, targetId);
      // Delete duplicate/conflicting connections before the user delete cascades
      db.prepare('DELETE FROM connections WHERE requester_id = ? OR receiver_id = ?').run(id, id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    })();
    res.json({ ok: true, merged: source.email, into: target.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/listings/:profileId — admin edit any listing's fields
router.put('/listings/:profileId', requireAuth, requireAdmin, (req, res) => {
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'Listing not found' });

  const { bio, category, price_per_session, zelle, venmo, custom_category, subcategory, session_type, title } = req.body;

  if (price_per_session !== undefined && (isNaN(Number(price_per_session)) || Number(price_per_session) < 0 || Number(price_per_session) > 10000)) {
    return res.status(400).json({ error: 'Price must be between $0 and $10,000' });
  }
  if (bio !== undefined && bio.trim().length < 20) {
    return res.status(400).json({ error: 'Description required (at least 20 characters)' });
  }
  if (session_type && !['zoom', 'in-person', 'both'].includes(session_type)) {
    return res.status(400).json({ error: 'Invalid session type' });
  }
  const normalizedCustom = custom_category !== undefined
    ? (custom_category?.trim().replace(/\b\w/g, c => c.toUpperCase()) || null)
    : undefined;

  db.prepare(`
    UPDATE provider_profiles
    SET bio = ?, category = ?, price_per_session = ?, zelle = ?, venmo = ?,
        custom_category = ?, subcategory = ?, session_type = ?, title = ?
    WHERE id = ?
  `).run(
    bio ?? profile.bio,
    category ?? profile.category,
    price_per_session !== undefined ? Number(price_per_session) : profile.price_per_session,
    zelle !== undefined ? zelle : profile.zelle,
    venmo !== undefined ? venmo : profile.venmo,
    normalizedCustom !== undefined ? normalizedCustom : profile.custom_category,
    subcategory !== undefined ? subcategory : profile.subcategory,
    session_type ?? profile.session_type ?? 'in-person',
    title !== undefined ? title : profile.title,
    profile.id
  );

  res.json(db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(profile.id));
});

// DELETE /api/admin/listings/:profileId — delete a provider listing only (keeps user account)
router.delete('/listings/:profileId', requireAuth, requireAdmin, (req, res) => {
  const profile = db.prepare('SELECT id, user_id FROM provider_profiles WHERE id = ?').get(req.params.profileId);
  if (!profile) return res.status(404).json({ error: 'Listing not found' });
  db.prepare('DELETE FROM provider_profiles WHERE id = ?').run(profile.id);
  const remaining = db.prepare('SELECT COUNT(*) as n FROM provider_profiles WHERE user_id = ?').get(profile.user_id);
  if (remaining.n === 0) db.prepare("UPDATE users SET role = 'student' WHERE id = ?").run(profile.user_id);
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

  const VALID_CATS = ['tutor', 'barber', 'hebrew tutor', 'fitness', 'tennis', 'other'];
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

// GET /api/admin/email-status — check what email transport is active
router.get('/email-status', requireAuth, requireAdmin, (req, res) => {
  res.json(emailConfigStatus());
});

// POST /api/admin/test-email — send a test email to the logged-in admin
router.post('/test-email', requireAuth, requireAdmin, async (req, res) => {
  const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.user.id);
  try {
    await sendVerificationCode(user.email, '123456');
    res.json({ ok: true, message: `Test email sent to ${user.email}` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, config: emailConfigStatus() });
  }
});

// GET /api/admin/pending-codes — view recent unused verification codes (debug)
router.get('/pending-codes', requireAuth, requireAdmin, (req, res) => {
  const codes = db.prepare(`
    SELECT vc.id, vc.code, vc.type, vc.expires_at, vc.used, u.email, u.name
    FROM verification_codes vc
    JOIN users u ON vc.user_id = u.id
    WHERE vc.used = 0 AND vc.expires_at > datetime('now')
    ORDER BY vc.id DESC
    LIMIT 50
  `).all();
  res.json(codes);
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
