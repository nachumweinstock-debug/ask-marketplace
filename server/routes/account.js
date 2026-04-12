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
  filename: (_, file, cb) => cb(null, `avatar-${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/account — full profile with stats
router.get('/', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, role, is_admin, avatar_url, major, classes_taking, gpa, user_bio, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const bookingStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM bookings WHERE student_id = ?
  `).get(req.user.id);

  let providerData = null;
  if (user.role === 'provider') {
    providerData = db.prepare(`
      SELECT pp.id as provider_profile_id, pp.rating, pp.review_count, pp.category, pp.custom_category,
             pp.bio, pp.price_per_session, pp.zelle, pp.venmo
      FROM provider_profiles pp WHERE pp.user_id = ?
    `).get(req.user.id);

    if (providerData) {
      const reviews = db.prepare(`
        SELECT r.*, u.name as student_name
        FROM reviews r
        JOIN users u ON r.student_id = u.id
        WHERE r.provider_id = ?
        ORDER BY r.created_at DESC
        LIMIT 10
      `).all(providerData.provider_profile_id);
      providerData.recent_reviews = reviews;
    }
  }

  res.json({
    ...user,
    total_bookings: bookingStats?.total || 0,
    completed_bookings: bookingStats?.completed || 0,
    ...(providerData || {}),
  });
});

// PUT /api/account — update profile fields
router.put('/', requireAuth, upload.single('avatar'), (req, res) => {
  const { name, major, classes_taking, gpa, user_bio } = req.body;
  const userUpdates = {};

  if (name?.trim())           userUpdates.name           = name.trim();
  if (major !== undefined)    userUpdates.major           = major;
  if (classes_taking !== undefined) userUpdates.classes_taking = classes_taking;
  if (gpa !== undefined)      userUpdates.gpa             = gpa;
  if (user_bio !== undefined) userUpdates.user_bio        = user_bio;
  if (req.file)               userUpdates.avatar_url      = `/uploads/${req.file.filename}`;

  if (Object.keys(userUpdates).length > 0) {
    const setClauses = Object.keys(userUpdates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...Object.values(userUpdates), req.user.id);
  }

  // Sync avatar_url to provider_profile if they're a provider
  if (userUpdates.avatar_url) {
    db.prepare('UPDATE provider_profiles SET avatar_url = ? WHERE user_id = ?').run(userUpdates.avatar_url, req.user.id);
  }

  // Update provider-specific fields if provided
  const { zelle, venmo } = req.body;
  if ((zelle !== undefined || venmo !== undefined) && req.user.role === 'provider') {
    const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(req.user.id);
    if (profile) {
      db.prepare('UPDATE provider_profiles SET zelle = ?, venmo = ? WHERE user_id = ?').run(
        zelle ?? profile.zelle,
        venmo ?? profile.venmo,
        req.user.id
      );
    }
  }

  const updated = db.prepare(
    'SELECT id, email, name, role, is_admin, avatar_url, major, classes_taking, gpa, user_bio FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json(updated);
});

export default router;
