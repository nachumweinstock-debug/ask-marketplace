import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { storeImage } from '../storage.js';

const router = Router();

const STANDARD_CATS = ['tutor', 'barber', 'hebrew tutor', 'tennis', 'other'];

// GET /providers/categories — distinct custom category labels (must be before /:id)
router.get('/categories', (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT custom_category
    FROM provider_profiles
    WHERE custom_category IS NOT NULL AND custom_category != ''
    ORDER BY custom_category
  `).all();
  res.json(rows.map(r => r.custom_category));
});

router.get('/', (req, res) => {
  const { category, search, sort } = req.query;
  let query = `
    SELECT pp.*, u.name, u.email
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (category && category !== 'all') {
    if (STANDARD_CATS.includes(category)) {
      query += ' AND pp.category = ?';
    } else {
      // Custom category — filter by the text label
      query += ' AND pp.custom_category = ?';
    }
    params.push(category);
  }
  if (search) {
    query += ' AND (u.name LIKE ? OR pp.bio LIKE ? OR pp.custom_category LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

// Any authenticated user can become a provider
router.post('/become', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user.id);
  if (!existing) {
    db.prepare('INSERT INTO provider_profiles (user_id, category) VALUES (?, ?)').run(req.user.id, 'other');
  }
  db.prepare("UPDATE users SET role = 'provider' WHERE id = ?").run(req.user.id);
  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

router.get('/me/profile', requireAuth, (req, res) => {
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No provider profile found' });
  res.json(profile);
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile) return res.status(404).json({ error: 'No provider profile found' });
    const { bio, category, price_per_session, zelle, venmo, custom_category, listing_image_data_url } = req.body;

    let listing_image = profile.listing_image;
    if (listing_image_data_url === null) {
      listing_image = null;
    } else if (listing_image_data_url?.startsWith('data:image/')) {
      listing_image = await storeImage(listing_image_data_url, 'listings', req.user.id);
    } else if (listing_image_data_url?.startsWith('http')) {
      listing_image = listing_image_data_url;
    }

    db.prepare(`
      UPDATE provider_profiles
      SET bio = ?, category = ?, price_per_session = ?, zelle = ?, venmo = ?, custom_category = ?, listing_image = ?
      WHERE user_id = ?
    `).run(
      bio ?? profile.bio,
      category ?? profile.category,
      price_per_session ?? profile.price_per_session,
      zelle ?? profile.zelle,
      venmo ?? profile.venmo,
      custom_category !== undefined ? custom_category : profile.custom_category,
      listing_image,
      req.user.id
    );

    res.json(db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user.id));
  } catch (err) {
    console.error('PUT /providers/me error:', err);
    res.status(500).json({ error: 'Failed to save listing' });
  }
});

router.delete('/me', requireAuth, (req, res) => {
  const profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No provider profile found' });

  // Delete profile — CASCADE handles availability, bookings, reviews
  db.prepare('DELETE FROM provider_profiles WHERE id = ?').run(profile.id);
  // Reset role to student
  db.prepare("UPDATE users SET role = 'student' WHERE id = ?").run(req.user.id);

  res.json({ ok: true });
});

router.get('/:id', (req, res) => {
  const provider = db.prepare(`
    SELECT pp.*, u.name, u.email
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
    SELECT r.*, u.name as student_name
    FROM reviews r
    JOIN users u ON r.student_id = u.id
    WHERE r.provider_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);

  res.json({ ...provider, availability, reviews });
});

export default router;
