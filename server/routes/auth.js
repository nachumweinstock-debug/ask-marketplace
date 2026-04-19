import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { sendPasswordResetCode } from '../email.js';

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

// POST /auth/signup — create account, log in immediately (no email verification)
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
      "INSERT INTO users (email, name, password, role, email_verified) VALUES (?, ?, ?, 'student', 1)"
    ).run(email.toLowerCase(), name.trim(), hashed);
    user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: 'Server error' });
  }

  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  res.json({ token, user });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (!user.password) {
    return res.status(401).json({ error: 'No password set. Use "Forgot password" to create one.' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// POST /auth/forgot-password — send reset code
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    console.log(`[AUTH] forgot-password: no account for ${email}`);
    return res.json({ ok: true });
  }

  const code = issueCode(user.id, 'reset');
  try {
    await sendPasswordResetCode(user.email, code);
    console.log(`[AUTH] Reset code sent to ${user.email}`);
  } catch (err) {
    console.error(`[AUTH] Reset email FAILED for ${user.email}:`, err.message);
    console.log(`[AUTH] FALLBACK RESET CODE for ${user.email}: ${code}`);
  }

  res.json({ ok: true, userId: user.id });
});

// POST /auth/verify-reset-code — check code is valid without consuming it
router.post('/verify-reset-code', (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: 'userId and code required' });

  const row = db.prepare(
    "SELECT * FROM verification_codes WHERE user_id = ? AND type = 'reset' AND used = 0 ORDER BY id DESC LIMIT 1"
  ).get(userId);

  if (!row) return res.status(400).json({ error: 'No reset code found. Request a new one.' });
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Code expired. Request a new one.' });
  if (row.code !== String(code).trim()) return res.status(400).json({ error: 'Incorrect code — check your email and try again.' });

  res.json({ ok: true });
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

// ── Google OAuth ───────────────────────────────────────────────────────────────

// GET /auth/google — redirect to Google consent screen
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google login not configured' });
  }
  const state = Buffer.from(req.query.redirect || '').toString('base64url');
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.SERVER_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /auth/google/callback — exchange code, find/create user, redirect to frontend
router.get('/google/callback', async (req, res) => {
  const FRONTEND = process.env.FRONTEND_URL || 'https://uask.live';
  const { code, state, error } = req.query;

  if (error || !code) return res.redirect(`${FRONTEND}/login?error=cancelled`);

  let redirect = '';
  try { redirect = Buffer.from(state || '', 'base64url').toString(); } catch {}

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.SERVER_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    // Fetch profile
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await infoRes.json();
    if (!profile.email) throw new Error('No email returned from Google');

    // Find or create user
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id);
    if (!user) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email.toLowerCase());
      if (user) {
        // Link Google to existing account
        db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(profile.id, user.id);
      } else {
        // New user — password '' means OAuth-only (login handler rejects empty passwords)
        const r = db.prepare(
          "INSERT INTO users (email, name, password, role, email_verified, google_id) VALUES (?, ?, '', 'student', 1, ?)"
        ).run(profile.email.toLowerCase(), profile.name || profile.email.split('@')[0], profile.id);
        user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(r.lastInsertRowid);
      }
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const next = redirect ? `&next=${encodeURIComponent(redirect)}` : '';
    console.log(`[AUTH] Google login: ${user.email}`);
    res.redirect(`${FRONTEND}/auth/callback?token=${token}${next}`);
  } catch (err) {
    console.error('[AUTH] Google callback error:', err.message);
    res.redirect(`${FRONTEND}/login?error=google_failed`);
  }
});

// ── Apple Sign In ──────────────────────────────────────────────────────────────

// GET /auth/apple — redirect to Apple consent screen
router.get('/apple', (req, res) => {
  if (!process.env.APPLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Apple login not configured' });
  }
  const state = Buffer.from(req.query.redirect || '').toString('base64url');
  const params = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID,
    redirect_uri: `${process.env.SERVER_URL}/api/auth/apple/callback`,
    response_type: 'code id_token',
    scope: 'name email',
    response_mode: 'form_post', // Apple always POSTs to callback
    state,
  });
  res.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
});

// POST /auth/apple/callback — Apple POSTs here with code + id_token
router.post('/apple/callback', async (req, res) => {
  const FRONTEND = process.env.FRONTEND_URL || 'https://uask.live';
  const { code, state, user: userJson, error } = req.body;

  if (error || !code) return res.redirect(`${FRONTEND}/login?error=cancelled`);

  let redirect = '';
  try { redirect = Buffer.from(state || '', 'base64url').toString(); } catch {}

  try {
    // Build client_secret JWT (required by Apple, signed with your .p8 key)
    const clientSecret = jwt.sign(
      {
        iss: process.env.APPLE_TEAM_ID,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'https://appleid.apple.com',
        sub: process.env.APPLE_CLIENT_ID,
      },
      process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Railway stores newlines as \n
      { algorithm: 'ES256', header: { alg: 'ES256', kid: process.env.APPLE_KEY_ID } }
    );

    // Exchange code for tokens
    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.SERVER_URL}/api/auth/apple/callback`,
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    // Decode id_token payload (trusted — came directly from Apple's token endpoint)
    const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString());
    const appleId = payload.sub;
    const email = payload.email;

    // Apple only sends name on the very first auth
    let name = '';
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        name = [u.name?.firstName, u.name?.lastName].filter(Boolean).join(' ').trim();
      } catch {}
    }

    // Find or create user
    let user = db.prepare('SELECT * FROM users WHERE apple_id = ?').get(appleId);
    if (!user && email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
      if (user) {
        db.prepare('UPDATE users SET apple_id = ? WHERE id = ?').run(appleId, user.id);
      }
    }
    if (!user) {
      const finalEmail = email || `apple.${appleId}@privaterelay.appleid.com`;
      const finalName  = name || (email ? email.split('@')[0] : 'Apple User');
      const r = db.prepare(
        "INSERT INTO users (email, name, password, role, email_verified, apple_id) VALUES (?, ?, '', 'student', 1, ?)"
      ).run(finalEmail.toLowerCase(), finalName, appleId);
      user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(r.lastInsertRowid);
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const next = redirect ? `&next=${encodeURIComponent(redirect)}` : '';
    console.log(`[AUTH] Apple login: ${user.email}`);
    res.redirect(`${FRONTEND}/auth/callback?token=${token}${next}`);
  } catch (err) {
    console.error('[AUTH] Apple callback error:', err.message);
    res.redirect(`${FRONTEND}/login?error=apple_failed`);
  }
});

export default router;
