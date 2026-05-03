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
