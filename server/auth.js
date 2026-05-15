import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET env var is not set. Refusing to start in production.');
    process.exit(1);
  }
  console.warn('[WARN] JWT_SECRET not set — using insecure dev fallback. Set it in Railway before going live.');
}
const _JWT_SECRET = JWT_SECRET || 'dev-only-insecure-fallback-do-not-use-in-prod';

// Permanently hardwired superadmins — always admin regardless of DB state
const SUPERADMINS = ['nachumweinstock@gmail.com'];

// Supabase admin client — used to verify Supabase JWTs server-side AND for storage uploads
export const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// Signs a token. Pass the DB user object so we can embed token_version (tv).
export function signToken(payload) {
  const tv = payload.token_version ?? 1;
  const { token_version: _tv, ...rest } = payload; // strip raw column name
  return jwt.sign({ ...rest, tv }, _JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try { return jwt.verify(token, _JWT_SECRET); } catch { return null; }
}

async function resolveSupabaseUser(token) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return null;
  const email = user.email.toLowerCase();
  let sqliteUser = db.prepare(`
    SELECT id, email, name, username, role, is_admin, avatar_url, university, major, interests,
           classes_taking, gpa, user_bio, zelle, venmo, phone, contact_pref, timezone,
           referral_code, referred_by, created_at
    FROM users WHERE email = ?
  `).get(email);
  if (!sqliteUser) {
    const name = user.user_metadata?.full_name || email.split('@')[0];
    db.prepare('INSERT OR IGNORE INTO users (email, name, password, role, email_verified) VALUES (?, ?, ?, ?, 1)')
      .run(email, name, '', 'student');
    sqliteUser = db.prepare(`
      SELECT id, email, name, username, role, is_admin, avatar_url, university, major, interests,
             classes_taking, gpa, user_bio, zelle, venmo, phone, contact_pref, timezone,
             referral_code, referred_by, created_at
      FROM users WHERE email = ?
    `).get(email);
  }
  if (SUPERADMINS.includes(email) && !sqliteUser.is_admin) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(sqliteUser.id);
    sqliteUser = { ...sqliteUser, is_admin: 1 };
  }
  return sqliteUser;
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  // Custom JWT takes priority
  const customUser = verifyToken(token);
  if (customUser) {
    // Refresh from DB so we always have up-to-date fields
    const dbUser = db.prepare(`
      SELECT id, email, name, username, role, is_admin, avatar_url, university, major, interests,
             classes_taking, gpa, user_bio, zelle, venmo, phone, contact_pref, timezone,
             referral_code, referred_by, created_at, token_version
      FROM users WHERE id = ?
    `).get(customUser.id);
    if (dbUser) {
      // Reject tokens issued before the current token_version (password reset invalidation)
      if (customUser.tv !== undefined && customUser.tv < (dbUser.token_version || 1)) {
        return res.status(401).json({ error: 'Session expired — please log in again.' });
      }
      if (SUPERADMINS.includes(dbUser.email) && !dbUser.is_admin) {
        db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(dbUser.id);
        dbUser.is_admin = 1;
      }
      req.user = dbUser;
      return next();
    }
  }

  // Legacy: fall back to Supabase JWT for users who haven't re-logged-in yet
  if (supabaseAdmin) {
    try {
      const sqliteUser = await resolveSupabaseUser(token);
      if (!sqliteUser) return res.status(401).json({ error: 'Session expired — please log in again.' });
      req.user = sqliteUser;
      return next();
    } catch (err) {
      console.error('[requireAuth] error:', err.message);
      return res.status(401).json({ error: 'Authentication failed — please log in again.' });
    }
  }

  return res.status(401).json({ error: 'Invalid token' });
}

export async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();

  // Custom JWT first
  const customUser = verifyToken(token);
  if (customUser) {
    const dbUser = db.prepare(`
      SELECT id, email, name, username, role, is_admin, avatar_url, university, major, interests,
             classes_taking, gpa, user_bio, zelle, venmo, phone, contact_pref, timezone,
             referral_code, referred_by, created_at
      FROM users WHERE id = ?
    `).get(customUser.id);
    if (dbUser) { req.user = dbUser; return next(); }
  }

  // Legacy Supabase fallback
  if (supabaseAdmin) {
    try {
      const sqliteUser = await resolveSupabaseUser(token);
      if (sqliteUser) req.user = sqliteUser;
    } catch { /* ignore */ }
  }

  next();
}
