import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { storeImage } from '../storage.js';

const router = Router();

function normalizeUsername(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

function ensureUsername(user) {
  if (user.username) return user.username;
  const base = normalizeUsername(user.name || user.email?.split('@')[0]) || 'user';
  let slug = base;
  let n = 2;
  while (db.prepare('SELECT 1 FROM users WHERE username = ? AND id != ?').get(slug, user.id)) {
    slug = `${base}-${n++}`;
  }
  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(slug, user.id);
  return slug;
}

// GET /api/account — full profile with stats
router.get('/', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, username, role, is_admin, avatar_url, major, classes_taking, gpa, user_bio, zelle, venmo, phone, contact_pref, timezone, referral_code, referred_by, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.username = ensureUsername(user);

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
    const { name, username, major, classes_taking, gpa, user_bio, avatar_data_url, zelle, venmo, phone, contact_pref, timezone } = req.body;
    const userUpdates = {};

    if (name?.trim())                 userUpdates.name           = name.trim().slice(0, 100);
    if (major !== undefined)          userUpdates.major          = String(major || '').slice(0, 100);
    if (classes_taking !== undefined) userUpdates.classes_taking = String(classes_taking || '').slice(0, 500);
    if (gpa !== undefined)            userUpdates.gpa            = gpa ? Math.min(Math.max(parseFloat(gpa) || 0, 0), 4.0) : null;
    if (user_bio !== undefined)       userUpdates.user_bio       = String(user_bio || '').slice(0, 1000);
    if (zelle !== undefined)          userUpdates.zelle          = String(zelle || '').slice(0, 100);
    if (venmo !== undefined)          userUpdates.venmo          = String(venmo || '').slice(0, 100);
    if (phone !== undefined)          userUpdates.phone          = String(phone || '').slice(0, 20);
    if (timezone !== undefined)       userUpdates.timezone       = String(timezone || '').slice(0, 80);
    if (username !== undefined) {
      const cleanUsername = normalizeUsername(username);
      if (cleanUsername.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
      if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(cleanUsername)) {
        return res.status(400).json({ error: 'Username can use letters, numbers, and dashes' });
      }
      const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(cleanUsername, req.user.id);
      if (taken) return res.status(409).json({ error: 'Username is already taken' });
      userUpdates.username = cleanUsername;
    }
    if (contact_pref !== undefined) {
      const allowed = ['imessage', 'whatsapp', ''];
      userUpdates.contact_pref = allowed.includes(contact_pref) ? contact_pref : '';
    }

    if (avatar_data_url && (avatar_data_url.startsWith('data:image/') || avatar_data_url.startsWith('http'))) {
      // Upload to Supabase Storage if it's a fresh base64 upload; http URLs are already stored
      const stored = avatar_data_url.startsWith('data:image/')
        ? await storeImage(avatar_data_url, 'avatars', req.user.id)
        : avatar_data_url;
      userUpdates.avatar_url = stored;
    }

    // Whitelist of allowed column names (defense-in-depth against injection)
    const ALLOWED_COLS = new Set(['name','username','major','classes_taking','gpa','user_bio','zelle','venmo','phone','contact_pref','avatar_url','timezone']);
    const safeUpdates = Object.fromEntries(Object.entries(userUpdates).filter(([k]) => ALLOWED_COLS.has(k)));
    if (Object.keys(safeUpdates).length > 0) {
      const setClauses = Object.keys(safeUpdates).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...Object.values(safeUpdates), req.user.id);
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
      'SELECT id, email, name, username, role, is_admin, avatar_url, major, classes_taking, gpa, user_bio, zelle, venmo, phone, contact_pref, timezone, referral_code FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json(updated);
  } catch (err) {
    console.error('PUT /account error:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;
