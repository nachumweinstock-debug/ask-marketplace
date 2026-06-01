import { Router } from 'express';
import { randomBytes } from 'crypto';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function cleanReferralCode(value) {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9]{3,32}$/.test(code) ? code : '';
}

function cleanUserId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function createReferralCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const bytes = randomBytes(8);
    const code = Array.from(bytes, b => REFERRAL_ALPHABET[b % REFERRAL_ALPHABET.length]).join('');
    if (!db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(code)) return code;
  }
  throw new Error('Unable to generate referral code');
}

function ensureCode(user) {
  if (user?.referral_code) return user.referral_code;
  const code = createReferralCode();
  db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, user.id);
  return code;
}

const redeemReferral = db.transaction(({ newUserId, referralCode }) => {
  const referrer = db.prepare('SELECT id FROM users WHERE UPPER(referral_code) = ?').get(referralCode);
  if (!referrer) return { status: 404, body: { error: 'Referral code not found' } };

  const referred = db.prepare('SELECT id, referred_by FROM users WHERE id = ?').get(newUserId);
  if (!referred) return { status: 404, body: { error: 'New user not found' } };
  if (referrer.id === referred.id) return { status: 400, body: { error: 'You cannot redeem your own referral code' } };
  if (referred.referred_by && referred.referred_by !== referrer.id) {
    return { status: 400, body: { error: 'This account already used a referral code' } };
  }

  db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').run(referrer.id, referred.id);
  db.prepare(`
    INSERT INTO referrals (referrer_id, referred_id, redeemed)
    VALUES (?, ?, 1)
    ON CONFLICT(referred_id) DO UPDATE SET
      referrer_id = excluded.referrer_id,
      redeemed = 1
  `).run(referrer.id, referred.id);

  return { status: 200, body: { ok: true, referrerId: referrer.id } };
});

router.post('/redeem', (req, res) => {
  const newUserId = cleanUserId(req.body?.newUserId);
  const referralCode = cleanReferralCode(req.body?.referralCode);
  if (!newUserId) return res.status(400).json({ error: 'newUserId is required' });
  if (!referralCode) return res.status(400).json({ error: 'Valid referralCode is required' });

  try {
    const result = redeemReferral({ newUserId, referralCode });
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[REFERRALS] redeem failed:', err.message);
    res.status(500).json({ error: 'Failed to redeem referral' });
  }
});

router.get('/stats/:userId', (req, res) => {
  const userId = cleanUserId(req.params.userId);
  if (!userId) return res.status(400).json({ error: 'Valid userId is required' });
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const row = db.prepare(`
    SELECT COUNT(DISTINCT referred_id) as count FROM (
      SELECT referred_id FROM referrals WHERE referrer_id = ? AND redeemed = 1
      UNION
      SELECT id as referred_id FROM users WHERE referred_by = ?
    )
  `).get(userId, userId);
  res.json({ count: Number(row?.count || 0) });
});

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
    invite_url: `https://uask.live/join/${encodeURIComponent(code)}`,
    invited_users: invited,
    successful_signups: invited.length,
    successful_bookings: invited.reduce((sum, row) => sum + Number(row.bookings || 0), 0),
  });
});

export default router;
