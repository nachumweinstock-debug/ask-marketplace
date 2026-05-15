import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { sendVerificationCode, emailConfigStatus, sendAdminPrankNotification } from '../email.js';
import { redactContactText } from '../redact.js';
import { getSitewideFirstTimeDiscountPercent, setSitewideFirstTimeDiscountPercent, getSurgePricingPercent, setSurgePricingPercent } from '../pricing.js';

const router = Router();

const HIDDEN_TEST_USER_WHERE = `
  (
    LOWER(email) LIKE 'codex-%@example.com'
    OR LOWER(email) LIKE 'codex-smoke-%'
    OR LOWER(email) LIKE 'codex-username-check-%'
    OR LOWER(name) LIKE 'codex smoke%'
    OR LOWER(name) LIKE 'codex username%'
  )
`;

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

// GET/PATCH /api/admin/site-sale — site-wide first-time sale control
router.get('/site-sale', requireAuth, requireAdmin, (req, res) => {
  res.json({ first_time_discount_percent: getSitewideFirstTimeDiscountPercent() });
});

router.patch('/site-sale', requireAuth, requireAdmin, (req, res) => {
  const percent = Number(req.body?.first_time_discount_percent || 0);
  if (![0, 15].includes(percent)) return res.status(400).json({ error: 'Site-wide sale must be 0% or 15%' });
  res.json({ first_time_discount_percent: setSitewideFirstTimeDiscountPercent(percent) });
});

// GET/PATCH /api/admin/surge-pricing — surge pricing control (+15%)
router.get('/surge-pricing', requireAuth, requireAdmin, (req, res) => {
  res.json({ surge_percent: getSurgePricingPercent() });
});

router.patch('/surge-pricing', requireAuth, requireAdmin, (req, res) => {
  const percent = Number(req.body?.surge_percent ?? 0);
  if (![0, 15].includes(percent)) return res.status(400).json({ error: 'Surge pricing must be 0% or 15%' });
  res.json({ surge_percent: setSurgePricingPercent(percent) });
});

// GET /api/admin/users — list all users (one row per user, most recent listing only)
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const { search = '', role = 'all', hidden = 'include' } = req.query;
  const filters = [];
  const params = [];
  if (search) {
    filters.push('(u.name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (role !== 'all') {
    filters.push('u.role = ?');
    params.push(role);
  }
  if (hidden === 'hide') filters.push(`NOT ${HIDDEN_TEST_USER_WHERE.replaceAll('email', 'u.email').replaceAll('name', 'u.name')}`);
  if (hidden === 'only') filters.push(HIDDEN_TEST_USER_WHERE.replaceAll('email', 'u.email').replaceAll('name', 'u.name'));
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.username, u.role, u.is_admin, u.created_at,
           pp.id as provider_profile_id, pp.rating, pp.review_count, pp.category, pp.custom_category,
           (SELECT COUNT(*) FROM bookings b WHERE b.student_id = u.id) as bookings_as_student,
           (SELECT COUNT(*) FROM direct_messages dm WHERE dm.sender_id = u.id AND dm.is_system = 0) as messages_sent,
           ${HIDDEN_TEST_USER_WHERE.replaceAll('email', 'u.email').replaceAll('name', 'u.name')} as is_hidden_test
    FROM users u
    LEFT JOIN (
      SELECT * FROM provider_profiles
      WHERE id IN (SELECT MAX(id) FROM provider_profiles GROUP BY user_id)
    ) pp ON pp.user_id = u.id
    ${where}
    ORDER BY u.created_at DESC
  `).all(...params);
  res.json(users);
});

// GET /api/admin/users/:id — detailed account view
router.get('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const user = db.prepare('SELECT id, email, name, username, role, is_admin, avatar_url, major, classes_taking, user_bio, phone, contact_pref, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const listings = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ? ORDER BY id DESC').all(req.params.id);
  const bookingsAsStudent = db.prepare(`
    SELECT b.*, a.date, a.start_time, a.end_time, pu.name as provider_name
    FROM bookings b
    JOIN availability a ON a.id = b.availability_id
    JOIN provider_profiles pp ON pp.id = b.provider_id
    JOIN users pu ON pu.id = pp.user_id
    WHERE b.student_id = ?
    ORDER BY b.id DESC LIMIT 12
  `).all(req.params.id);
  const bookingsAsProvider = db.prepare(`
    SELECT b.*, a.date, a.start_time, a.end_time, su.name as student_name
    FROM bookings b
    JOIN availability a ON a.id = b.availability_id
    JOIN users su ON su.id = b.student_id
    JOIN provider_profiles pp ON pp.id = b.provider_id
    WHERE pp.user_id = ?
    ORDER BY b.id DESC LIMIT 12
  `).all(req.params.id);
  const messages = db.prepare(`
    SELECT dm.id, dm.sender_id, dm.receiver_id, dm.body, dm.created_at, dm.is_system,
           s.name as sender_name, r.name as receiver_name
    FROM direct_messages dm
    JOIN users s ON s.id = dm.sender_id
    JOIN users r ON r.id = dm.receiver_id
    WHERE dm.sender_id = ? OR dm.receiver_id = ?
    ORDER BY dm.id DESC LIMIT 12
  `).all(req.params.id, req.params.id).map(message => ({
    ...message,
    body: redactContactText(message.body),
  }));
  res.json({ user, listings, bookingsAsStudent, bookingsAsProvider, messages });
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

  const { bio, category, price_per_session, zelle, venmo, custom_category, subcategory, session_type, title, first_time_discount_percent } = req.body;

  if (price_per_session !== undefined && (isNaN(Number(price_per_session)) || Number(price_per_session) < 0 || Number(price_per_session) > 10000)) {
    return res.status(400).json({ error: 'Price must be between $0 and $10,000' });
  }
  if (bio !== undefined && bio.trim().length < 20) {
    return res.status(400).json({ error: 'Description required (at least 20 characters)' });
  }
  if (session_type && !['zoom', 'in-person', 'both'].includes(session_type)) {
    return res.status(400).json({ error: 'Invalid session type' });
  }
  const discountPercent = first_time_discount_percent !== undefined ? Number(first_time_discount_percent) : profile.first_time_discount_percent;
  if (![0, 15, 20].includes(Number(discountPercent || 0))) {
    return res.status(400).json({ error: 'Discount must be 0%, 15%, or 20%' });
  }
  const normalizedCustom = custom_category !== undefined
    ? (custom_category?.trim().replace(/\b\w/g, c => c.toUpperCase()) || null)
    : undefined;

  db.prepare(`
    UPDATE provider_profiles
    SET bio = ?, category = ?, price_per_session = ?, zelle = ?, venmo = ?,
        custom_category = ?, subcategory = ?, session_type = ?, title = ?,
        first_time_discount_percent = ?
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
    Number(discountPercent || 0),
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

router.get('/reviews/reports', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT rr.*, r.rating, r.comment, r.hidden, r.provider_id,
           reporter.name as reporter_name,
           student.name as student_name,
           provider.name as provider_name
    FROM review_reports rr
    JOIN reviews r ON r.id = rr.review_id
    JOIN users reporter ON reporter.id = rr.reporter_id
    JOIN users student ON student.id = r.student_id
    JOIN provider_profiles pp ON pp.id = r.provider_id
    JOIN users provider ON provider.id = pp.user_id
    ORDER BY rr.created_at DESC
  `).all();
  res.json(rows);
});

router.patch('/reviews/:reviewId', requireAuth, requireAdmin, (req, res) => {
  const { hidden, report_status } = req.body;
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.reviewId);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (hidden !== undefined) {
    db.prepare('UPDATE reviews SET hidden = ? WHERE id = ?').run(hidden ? 1 : 0, review.id);
  }
  if (report_status) {
    db.prepare('UPDATE review_reports SET status = ? WHERE review_id = ?').run(report_status, review.id);
  }
  res.json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(review.id));
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
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'You cannot delete your own admin account' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// DELETE /api/admin/test-users — remove disposable Codex smoke/test users
router.delete('/test-users', requireAuth, requireAdmin, (req, res) => {
  const ids = db.prepare(`SELECT id FROM users WHERE ${HIDDEN_TEST_USER_WHERE}`).all().map(r => r.id);
  const tx = db.transaction(() => {
    for (const id of ids) db.prepare('DELETE FROM users WHERE id = ?').run(id);
  });
  tx();
  res.json({ ok: true, deleted: ids.length });
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
        "INSERT INTO provider_profiles (user_id, category, custom_category, bio, price_per_session, zelle, venmo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
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

router.post('/prank-email', requireAuth, requireAdmin, async (req, res) => {
  try {
    await sendAdminPrankNotification();
    res.json({ ok: true, message: 'Clearly labeled admin prank/test email sent to both admins.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, config: emailConfigStatus() });
  }
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
    listings:  db.prepare('SELECT COUNT(*) as n FROM provider_profiles').get().n,
    bookings:  db.prepare('SELECT COUNT(*) as n FROM bookings').get().n,
    pending_bookings: db.prepare("SELECT COUNT(*) as n FROM bookings WHERE status = 'pending'").get().n,
    messages:  db.prepare('SELECT COUNT(*) as n FROM direct_messages').get().n,
    reviews:   db.prepare('SELECT COUNT(*) as n FROM reviews').get().n,
    hidden_test_users: db.prepare(`SELECT COUNT(*) as n FROM users WHERE ${HIDDEN_TEST_USER_WHERE}`).get().n,
  };
  res.json(stats);
});

router.get('/activity', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 8').all();
  const bookings = db.prepare(`
    SELECT b.id, b.status, b.created_at, su.name as student_name, pu.name as provider_name
    FROM bookings b
    JOIN users su ON su.id = b.student_id
    JOIN provider_profiles pp ON pp.id = b.provider_id
    JOIN users pu ON pu.id = pp.user_id
    ORDER BY b.id DESC LIMIT 8
  `).all();
  const listings = db.prepare(`
    SELECT pp.id, pp.title, pp.category, pp.custom_category, u.name, u.email
    FROM provider_profiles pp
    JOIN users u ON u.id = pp.user_id
    ORDER BY pp.id DESC LIMIT 8
  `).all();
  res.json({ users, bookings, listings });
});

export default router;
