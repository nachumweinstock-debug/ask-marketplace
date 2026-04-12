import { Router } from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const DATA_DIR = process.env.DATA_DIR || join(__dirname, '../..');
const storage = multer.diskStorage({
  destination: join(DATA_DIR, 'uploads'),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

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
    query += ' AND pp.category = ?';
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

router.put('/me', requireAuth, upload.single('avatar'), (req, res) => {
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No provider profile found' });
  const { bio, category, price_per_session, zelle, venmo, custom_category } = req.body;

  const avatar_url = req.file ? `/uploads/${req.file.filename}` : profile.avatar_url;

  db.prepare(`
    UPDATE provider_profiles
    SET bio = ?, category = ?, price_per_session = ?, zelle = ?, venmo = ?, avatar_url = ?, custom_category = ?
    WHERE user_id = ?
  `).run(
    bio ?? profile.bio,
    category ?? profile.category,
    price_per_session ?? profile.price_per_session,
    zelle ?? profile.zelle,
    venmo ?? profile.venmo,
    avatar_url,
    custom_category !== undefined ? custom_category : profile.custom_category,
    req.user.id
  );

  res.json(db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user.id));
});

router.get('/:id', (req, res) => {
  const provider = db.prepare(`
    SELECT pp.*, u.name, u.email
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.id = ?
  `).get(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const availability = db.prepare(
    'SELECT * FROM availability WHERE provider_id = ? AND is_booked = 0 AND date >= date("now") ORDER BY date, start_time'
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
