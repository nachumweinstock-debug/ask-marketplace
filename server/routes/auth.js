import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { sendVerificationCode, sendPasswordResetCode } from '../email.js';

const router = Router();

// GET /auth/me — sync/create SQLite user from Supabase JWT, return user data
router.get('/me', requireAuth, (req, res) => {
  // Attach provider profile fields so the navbar can show the service type
  const pp = db.prepare('SELECT id as provider_profile_id, category as provider_category, custom_category as provider_custom_category, session_type as provider_session_type FROM provider_profiles WHERE user_id = ?').get(req.user.id);
  res.json({ ...req.user, ...(pp || {}) });
});

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function issueCode(userId, type = 'verify') {
  db.prepare('DELETE FROM verification_codes WHERE user_id = ? AND type = ?').run(userId, type);
  const code = generateCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO verification_codes (user_id, code, type, expires_at) VALUES (?, ?, ?, ?)').run(userId, code, type, expires);
  return code;
}

// POST /auth/signup — creates unverified account, sends code
router.post('/signup', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const hashed = await bcrypt.hash(password, 10);
  let user;
  try {
    const result = db.prepare(
      'INSERT INTO users (email, name, password, role, email_verified) VALUES (?, ?, ?, ?, 0)'
    ).run(email.toLowerCase(), name, hashed, 'student');
    user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      // If account exists but unverified, let them re-verify
      const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
      if (existing && !existing.email_verified) {
        user = { id: existing.id, email: existing.email, name: existing.name, role: existing.role };
      } else {
        return res.status(409).json({ error: 'Email already registered' });
      }
    } else {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  const code = issueCode(user.id);
  try {
    await sendVerificationCode(user.email, code);
  } catch (err) {
    console.error('Email send failed:', err.message);
    // Don't block signup if email fails — code is still in DB
  }

  res.json({ needsVerification: true, userId: user.id, email: user.email });
});

// POST /auth/verify — submit the 6-digit code
router.post('/verify', (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: 'userId and code required' });

  const row = db.prepare(
    "SELECT * FROM verification_codes WHERE user_id = ? AND type = 'verify' AND used = 0 ORDER BY id DESC LIMIT 1"
  ).get(userId);

  if (!row) return res.status(400).json({ error: 'No code found. Request a new one.' });
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Code expired. Request a new one.' });
  if (row.code !== String(code).trim()) return res.status(400).json({ error: 'Incorrect code' });

  db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(row.id);
  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(userId);

  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(userId);
  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  res.json({ token, user });
});

// POST /auth/resend — resend code
router.post('/resend', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND email_verified = 0').get(userId);
  if (!user) return res.status(400).json({ error: 'User not found or already verified' });

  const code = issueCode(user.id);
  try {
    await sendVerificationCode(user.email, code);
  } catch (err) {
    console.error('Resend failed:', err.message);
  }

  res.json({ ok: true });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  if (!user.email_verified) {
    // Resend code and prompt verification
    const code = issueCode(user.id);
    try { await sendVerificationCode(user.email, code); } catch {}
    return res.status(403).json({
      error: 'Email not verified',
      needsVerification: true,
      userId: user.id,
      email: user.email,
    });
  }

  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// POST /auth/forgot-password — send reset code
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  // Always respond OK so we don't leak whether an email exists
  if (!user) return res.json({ ok: true });

  const code = issueCode(user.id, 'reset');
  try {
    await sendPasswordResetCode(user.email, code);
  } catch (err) {
    console.error('Reset email failed:', err.message);
  }

  res.json({ ok: true, userId: user.id });
});

// POST /auth/reset-password — verify code + set new password
router.post('/reset-password', async (req, res) => {
  const { userId, code, password } = req.body;
  if (!userId || !code || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const row = db.prepare(
    "SELECT * FROM verification_codes WHERE user_id = ? AND type = 'reset' AND used = 0 ORDER BY id DESC LIMIT 1"
  ).get(userId);

  if (!row) return res.status(400).json({ error: 'No reset code found. Request a new one.' });
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Code expired. Request a new one.' });
  if (row.code !== String(code).trim()) return res.status(400).json({ error: 'Incorrect code' });

  db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(row.id);
  const hashed = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password = ?, email_verified = 1 WHERE id = ?').run(hashed, userId);

  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(userId);
  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  res.json({ token, user });
});

export default router;
