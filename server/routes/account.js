import { Router } from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const storage = multer.diskStorage({
  destination: join(__dirname, '../../uploads'),
  filename: (_, file, cb) => cb(null, `avatar-${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/account — full profile with stats
router.get('/', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Booking stats
  const bookingStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM bookings WHERE student_id = ?
  `).get(req.user.id);

  let providerData = null;
  if (user.role === 'provider') {
    providerData = db.prepare(`
      SELECT pp.rating, pp.review_count, pp.category, pp.bio, pp.price_per_session
      FROM provider_profiles pp WHERE pp.user_id = ?
    `).get(req.user.id);
  }

  res.json({
    ...user,
    total_bookings: bookingStats?.total || 0,
    completed_bookings: bookingStats?.completed || 0,
    ...(providerData || {}),
  });
});

// PUT /api/account — update name + avatar
router.put('/', requireAuth, upload.single('avatar'), (req, res) => {
  const { name } = req.body;
  const updates = {};

  if (name?.trim()) updates.name = name.trim();
  if (req.file) updates.avatar_url = `/uploads/${req.file.filename}`;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), req.user.id);

  // Sync avatar to provider_profile if they're a provider
  if (updates.avatar_url) {
    db.prepare('UPDATE provider_profiles SET avatar_url = ? WHERE user_id = ?').run(updates.avatar_url, req.user.id);
  }

  const updated = db.prepare('SELECT id, email, name, role, avatar_url FROM users WHERE id = ?').get(req.user.id);
  res.json(updated);
});

export default router;
