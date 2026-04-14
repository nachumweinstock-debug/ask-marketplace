import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { storeImage } from '../storage.js';

const router = Router();
const STANDARD_CATS = ['tutor', 'barber', 'hebrew tutor', 'fitness', 'tennis', 'other'];

// ── Named routes (must come before /:id) ──────────────────────────────────────

// GET /providers/price-stats?category=tutor&subcategory=Excel
router.get('/price-stats', (req, res) => {
  const { category, subcategory } = req.query;
  if (!category) return res.status(400).json({ error: 'category required' });
  let q = 'SELECT COUNT(*) as count, MIN(price_per_session) as min, MAX(price_per_session) as max, ROUND(AVG(price_per_session)) as avg FROM provider_profiles WHERE price_per_session > 0';
  const params = [];
  if (category === 'fitness') {
    q += " AND category IN ('fitness','tennis')";
  } else {
    q += ' AND (category = ? OR custom_category = ?)';
    params.push(category, category);
  }
  if (subcategory) {
    q += ' AND subcategory = ?';
    params.push(subcategory);
  }
  const stats = db.prepare(q).get(...params);
  res.json(stats);
});

// GET /providers/categories
router.get('/categories', (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT custom_category FROM provider_profiles
    WHERE custom_category IS NOT NULL AND custom_category != ''
    ORDER BY custom_category
  `).all();
  res.json(rows.map(r => r.custom_category));
});

// GET /providers/subcategories?category=tutor — distinct subcategories for a parent category
router.get('/subcategories', (req, res) => {
  const { category } = req.query;
  if (!category) return res.json([]);
  // treat tutor + 'fitness'/'tennis' as buckets
  const cats = category === 'fitness' ? ['fitness', 'tennis'] : [category];
  const placeholders = cats.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT DISTINCT subcategory FROM provider_profiles
    WHERE category IN (${placeholders})
      AND subcategory IS NOT NULL AND subcategory != ''
    ORDER BY subcategory
  `).all(...cats);
  res.json(rows.map(r => r.subcategory));
});

// GET /providers/mine — all listings owned by logged-in user
router.get('/mine', requireAuth, (req, res) => {
  const listings = db.prepare(`
    SELECT pp.*,
      (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'completed') as completed_sessions,
      (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'pending') as pending_bookings
    FROM provider_profiles pp
    WHERE pp.user_id = ?
    ORDER BY pp.id DESC
  `).all(req.user.id);
  res.json(listings);
});

// GET /providers/me/profile — first/most recent profile (backwards compat)
router.get('/me/profile', requireAuth, (req, res) => {
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No provider profile found' });
  res.json(profile);
});

// GET /providers — browse all
router.get('/', (req, res) => {
  const { category, subcategory, search, sort, session_type } = req.query;
  let query = `
    SELECT pp.*, u.name, u.email,
      (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'completed') as completed_sessions
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (category && category !== 'all') {
    if (category === 'fitness') {
      // fitness covers both 'fitness' and legacy 'tennis'
      query += " AND pp.category IN ('fitness', 'tennis')";
    } else if (STANDARD_CATS.includes(category)) {
      query += ' AND pp.category = ?';
      params.push(category);
    } else {
      query += ' AND pp.custom_category = ?';
      params.push(category);
    }
  }
  if (subcategory && subcategory !== 'all') {
    query += ' AND pp.subcategory = ?';
    params.push(subcategory);
  }
  if (session_type && session_type !== 'all') {
    query += " AND (pp.session_type = ? OR pp.session_type = 'both')";
    params.push(session_type);
  }
  if (search) {
    query += ' AND (u.name LIKE ? OR pp.bio LIKE ? OR pp.subcategory LIKE ? OR pp.custom_category LIKE ? OR pp.title LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (sort === 'newest') {
    query += ' ORDER BY pp.id DESC';
  } else if (sort === 'price_asc') {
    query += ' ORDER BY pp.price_per_session ASC';
  } else {
    query += ' ORDER BY pp.rating DESC, pp.review_count DESC';
  }
  res.json(db.prepare(query).all(...params));
});

// POST /providers/become — create a new listing (always creates new, no longer a toggle)
router.post('/become', requireAuth, (req, res) => {
  db.prepare('INSERT INTO provider_profiles (user_id, category) VALUES (?, ?)').run(req.user.id, 'other');
  db.prepare("UPDATE users SET role = 'provider' WHERE id = ?").run(req.user.id);
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user.id);
  res.json({ user, profile_id: profile.id });
});

// PUT /providers/me — update most recent listing (backwards compat for CreateListing)
router.put('/me', requireAuth, async (req, res) => {
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No provider profile found' });
  await updateProfile(req, res, profile);
});

// PUT /providers/:id — update a specific listing by id
router.put('/:id', requireAuth, async (req, res) => {
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!profile) return res.status(404).json({ error: 'Listing not found' });
  await updateProfile(req, res, profile);
});

// DELETE /providers/me — delete most recent listing (backwards compat)
router.delete('/me', requireAuth, (req, res) => {
  const profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No provider profile found' });
  deleteProfile(req.user.id, profile.id, res);
});

// DELETE /providers/:id — delete a specific listing
router.delete('/:id', requireAuth, (req, res) => {
  const profile = db.prepare('SELECT id FROM provider_profiles WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!profile) return res.status(404).json({ error: 'Listing not found' });
  deleteProfile(req.user.id, profile.id, res);
});

// GET /providers/:id — public listing page
router.get('/:id', (req, res) => {
  const provider = db.prepare(`
    SELECT pp.*, u.name, u.email,
      (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'completed') as completed_sessions
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.id = ?
  `).get(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const DAY_ORDER = `CASE date WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7 ELSE 8 END`;
  const availability = db.prepare(
    `SELECT * FROM availability WHERE provider_id = ? AND is_booked = 0 ORDER BY ${DAY_ORDER}, start_time`
  ).all(req.params.id);

  const reviews = db.prepare(`
    SELECT r.*, u.name as student_name FROM reviews r
    JOIN users u ON r.student_id = u.id
    WHERE r.provider_id = ? ORDER BY r.created_at DESC
  `).all(req.params.id);

  res.json({ ...provider, availability, reviews });
});

// ── Shared helpers ─────────────────────────────────────────────────────────────

async function updateProfile(req, res, profile) {
  try {
    const { bio, category, price_per_session, zelle, venmo, custom_category, subcategory, listing_image_data_url, session_type, title } = req.body;
    if (price_per_session !== undefined && (isNaN(price_per_session) || price_per_session < 0 || price_per_session > 10000)) {
      return res.status(400).json({ error: 'Price must be between $0 and $10,000' });
    }
    if (custom_category && custom_category.length > 50) return res.status(400).json({ error: 'Category name too long (max 50 chars)' });
    if (subcategory && subcategory.length > 60) return res.status(400).json({ error: 'Specialty too long (max 60 chars)' });
    if (bio && bio.length > 2000) return res.status(400).json({ error: 'Bio too long (max 2000 chars)' });
    if (session_type && !['zoom', 'in-person', 'both'].includes(session_type)) {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    // Normalize category: 'tennis' legacy → 'fitness'
    const normalizedCategory = (category === 'tennis' ? 'fitness' : category) ?? profile.category;

    let listing_image = profile.listing_image;
    if (listing_image_data_url === null) {
      listing_image = null;
    } else if (listing_image_data_url?.startsWith('data:image/')) {
      listing_image = await storeImage(listing_image_data_url, 'listings', profile.id);
    } else if (listing_image_data_url?.startsWith('http')) {
      listing_image = listing_image_data_url;
    }

    db.prepare(`
      UPDATE provider_profiles
      SET bio = ?, category = ?, price_per_session = ?, zelle = ?, venmo = ?,
          custom_category = ?, subcategory = ?, listing_image = ?, session_type = ?, title = ?
      WHERE id = ?
    `).run(
      bio ?? profile.bio,
      normalizedCategory,
      price_per_session ?? profile.price_per_session,
      zelle ?? profile.zelle,
      venmo ?? profile.venmo,
      custom_category !== undefined ? custom_category : profile.custom_category,
      subcategory !== undefined ? subcategory : profile.subcategory,
      listing_image,
      session_type ?? profile.session_type ?? 'in-person',
      title !== undefined ? title : profile.title,
      profile.id
    );

    res.json(db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(profile.id));
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ error: 'Failed to save listing' });
  }
}

function deleteProfile(userId, profileId, res) {
  db.prepare('DELETE FROM provider_profiles WHERE id = ?').run(profileId);
  // Only reset role to student if they have no more listings
  const remaining = db.prepare('SELECT COUNT(*) as n FROM provider_profiles WHERE user_id = ?').get(userId);
  if (remaining.n === 0) {
    db.prepare("UPDATE users SET role = 'student' WHERE id = ?").run(userId);
  }
  res.json({ ok: true });
}

export default router;
