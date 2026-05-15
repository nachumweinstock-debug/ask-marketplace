import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function ensureCode(user) {
  if (user.referral_code) return user.referral_code;
  const seed = (user.name || 'ask').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 8) || 'ask';
  const code = `${seed}${user.id}`.slice(0, 20);
  db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, user.id);
  return code;
}

router.get('/admin/all', requireAuth, (req, res) => {
  const me = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!me?.is_admin) return res.status(403).json({ error: 'Admin only' });

  const referrers = db.prepare(`
    SELECT u.id, u.name, u.email, u.referral_code, u.created_at,
      COUNT(DISTINCT r.id) AS signups
    FROM users u
    LEFT JOIN users r ON r.referred_by = u.id
    WHERE u.referral_code IS NOT NULL
    GROUP BY u.id
    ORDER BY signups DESC, u.created_at DESC
  `).all();

  const result = referrers.map(row => {
    const referred = db.prepare(`
      SELECT u.id, u.name, u.email, u.created_at,
        (SELECT COUNT(*) FROM bookings b WHERE b.student_id = u.id) AS bookings
      FROM users u WHERE u.referred_by = ?
      ORDER BY u.created_at DESC
    `).all(row.id);
    return {
      ...row,
      signups: referred.length,
      bookings: referred.reduce((s, u) => s + Number(u.bookings || 0), 0),
      referred_users: referred,
    };
  });

  const totals = {
    total_referrers: result.filter(r => r.signups > 0).length,
    total_signups: result.reduce((s, r) => s + r.signups, 0),
    total_bookings: result.reduce((s, r) => s + r.bookings, 0),
  };

  res.json({ referrers: result, totals });
});

router.get('/mine', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, referral_code FROM users WHERE id = ?').get(req.user.id);
  const code = ensureCode(user);
  const invited = db.prepare(`
    SELECT u.id, u.name, u.email, u.created_at,
      (SELECT COUNT(*) FROM bookings b WHERE b.student_id = u.id) as bookings
    FROM users u
    WHERE u.referred_by = ?
    ORDER BY u.created_at DESC
  `).all(req.user.id);
  res.json({
    code,
    invite_url: `https://www.uask.live/signup?ref=${encodeURIComponent(code)}`,
    invited_users: invited,
    successful_signups: invited.length,
    successful_bookings: invited.reduce((sum, row) => sum + Number(row.bookings || 0), 0),
  });
});

export default router;
