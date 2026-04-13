import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { storeImage } from '../storage.js';

const router = Router();

// GET /api/account — full profile with stats
router.get('/', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, role, is_admin, avatar_url, major, classes_taking, gpa, user_bio, zelle, venmo, phone, contact_pref, created_at FROM users WHERE id = ?'
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

  // Prefer provider_profile zelle/venmo if set, otherwise fall back to user-level
  const zelle = providerData?.zelle ?? user.zelle;
  const venmo = providerData?.venmo ?? user.venmo;

  // Spread providerData first so user-level fields (name, email, etc.) from `user` take precedence,
  // then explicitly set the resolved zelle/venmo so neither spread can overwrite them with null.
  res.json({
    ...(providerData || {}),
    ...user,
    zelle,
    venmo,
    total_bookings: bookingStats?.total || 0,
    completed_bookings: bookingStats?.completed || 0,
    recent_reviews: providerData?.recent_reviews ?? [],
  });
});

// PUT /api/account — update profile fields
// Avatar is sent as a base64 data URL; server uploads it to Supabase Storage (or keeps base64 as fallback)
router.put('/', requireAuth, async (req, res) => {
  try {
    const { name, major, classes_taking, gpa, user_bio, avatar_data_url, zelle, venmo, phone, contact_pref } = req.body;
    const userUpdates = {};

    if (name?.trim())                 userUpdates.name           = name.trim();
    if (major !== undefined)          userUpdates.major          = major;
    if (classes_taking !== undefined) userUpdates.classes_taking = classes_taking;
    if (gpa !== undefined)            userUpdates.gpa            = gpa;
    if (user_bio !== undefined)       userUpdates.user_bio       = user_bio;
    if (zelle !== undefined)          userUpdates.zelle          = zelle;
    if (venmo !== undefined)          userUpdates.venmo          = venmo;
    if (phone !== undefined)          userUpdates.phone          = phone;
    if (contact_pref !== undefined)   userUpdates.contact_pref   = contact_pref;

    if (avatar_data_url && (avatar_data_url.startsWith('data:image/') || avatar_data_url.startsWith('http'))) {
      // Upload to Supabase Storage if it's a fresh base64 upload; http URLs are already stored
      const stored = avatar_data_url.startsWith('data:image/')
        ? await storeImage(avatar_data_url, 'avatars', req.user.id)
        : avatar_data_url;
      userUpdates.avatar_url = stored;
    }

    if (Object.keys(userUpdates).length > 0) {
      const setClauses = Object.keys(userUpdates).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...Object.values(userUpdates), req.user.id);
    }

    // Sync avatar to provider_profile if changed
    if (userUpdates.avatar_url) {
      db.prepare('UPDATE provider_profiles SET avatar_url = ? WHERE user_id = ?')
        .run(userUpdates.avatar_url, req.user.id);
    }

    // Sync zelle/venmo to provider_profile if one exists
    if (zelle !== undefined || venmo !== undefined) {
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
      'SELECT id, email, name, role, is_admin, avatar_url, major, classes_taking, gpa, user_bio, zelle, venmo, phone, contact_pref FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json(updated);
  } catch (err) {
    console.error('PUT /account error:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;
