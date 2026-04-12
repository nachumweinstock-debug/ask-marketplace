import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ask-yu-secret-2024';

// Supabase admin client — used to verify Supabase JWTs server-side
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// Legacy — kept for backwards compat
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  // Supabase token verification (when configured)
  if (supabaseAdmin) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user?.email) {
        const email = user.email.toLowerCase();
        let sqliteUser = db.prepare('SELECT id, email, name, role, is_admin, major, classes_taking, gpa, user_bio, avatar_url FROM users WHERE email = ?').get(email);
        if (!sqliteUser) {
          const name = user.user_metadata?.full_name || email.split('@')[0];
          db.prepare('INSERT OR IGNORE INTO users (email, name, password, role, email_verified) VALUES (?, ?, ?, ?, 1)')
            .run(email, name, '', 'student');
          sqliteUser = db.prepare('SELECT id, email, name, role, is_admin, major, classes_taking, gpa, user_bio, avatar_url FROM users WHERE email = ?').get(email);
        }
        req.user = sqliteUser;
        return next();
      }
    } catch { /* fall through */ }
  }

  // Legacy custom JWT fallback
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
}
