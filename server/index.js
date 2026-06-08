import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { accessSync, constants, mkdirSync } from 'fs';
import authRoutes from './routes/auth.js';
import providerRoutes from './routes/providers.js';
import availabilityRoutes from './routes/availability.js';
import bookingRoutes from './routes/bookings.js';
import reviewRoutes from './routes/reviews.js';
import accountRoutes from './routes/account.js';
import adminRoutes from './routes/admin.js';
import messageRoutes from './routes/messages.js';
import dmRoutes from './routes/dm.js';
import peopleRoutes from './routes/people.js';
import keysRoutes from './routes/keys.js';
import helpWantedRoutes from './routes/helpwanted.js';
import timeRequestRoutes from './routes/timerequests.js';
import analyticsRoutes from './routes/analytics.js';
import supportRoutes from './routes/support.js';
import savedTutorsRoutes from './routes/savedTutors.js';
import trustRoutes from './routes/trust.js';
import providerMediaRoutes from './routes/providerMedia.js';
import reminderRoutes from './routes/reminders.js';
import referralRoutes from './routes/referrals.js';
import hangoutsRoutes from './routes/hangouts.js';
import db from './db.js';
import { startReminderJobs } from './reminders.js';
import posthog from './posthog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // Railway sits behind a proxy
const PORT = process.env.PORT || 3001;

// DATA_DIR is a persistent volume path in production (e.g. /data on Railway)
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..');
mkdirSync(join(DATA_DIR, 'uploads'), { recursive: true });

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://uask.live',
  'https://www.uask.live',
  'capacitor://localhost',  // Capacitor iOS app
  'http://localhost',       // Capacitor Android / local WebView
  process.env.FRONTEND_URL,
].filter(Boolean);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image loads from Vercel
  contentSecurityPolicy: false, // handled by Vercel on the frontend
}));

// Strict limiter — only for endpoints that can be brute-forced
// (login, signup, password reset). NOT applied to /auth/me or OAuth callbacks.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 300,
  message: { error: 'Too many attempts — please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 200 : 2000,
  message: { error: 'Too many requests — slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limiter for write-heavy endpoints (DMs, bookings, help-wanted, connections)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 15 : 200,
  message: { error: 'Too many requests — slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply strict limiter only to the endpoints that are actually brute-forceable.
// /auth/me, /auth/google/*, /auth/apple/* are intentionally excluded.
const RATE_LIMITED_AUTH = ['/login', '/signup', '/forgot-password', '/verify-reset-code', '/reset-password'];
for (const path of RATE_LIMITED_AUTH) {
  app.use(`/api/auth${path}`, authLimiter);
}
app.use('/api/admin/bootstrap', authLimiter);

app.use('/api', apiLimiter);

// Tighter limits on spam-prone write endpoints
app.post('/api/dm/:userId', writeLimiter);
app.post('/api/bookings', writeLimiter);
app.post('/api/help-wanted', writeLimiter);
app.post('/api/people/connections', writeLimiter);
app.post('/api/time-requests', writeLimiter);
app.post('/api/hangouts', writeLimiter);
app.post('/api/hangouts/:id/join', writeLimiter);
app.post('/api/hangouts/:id/messages', writeLimiter);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server / curl
    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true })); // needed for Apple Sign In POST callback
app.use('/uploads', express.static(join(DATA_DIR, 'uploads')));

app.get('/api/health', (_, res) => {
  const startedAt = process.uptime();
  let database = 'ok';
  let storage = 'ok';
  try {
    db.prepare('SELECT 1 as ok').get();
  } catch (err) {
    database = err.message || 'error';
  }
  try {
    accessSync(join(DATA_DIR, 'uploads'), constants.R_OK | constants.W_OK);
  } catch (err) {
    storage = err.message || 'error';
  }
  const requiredEnv = ['JWT_SECRET'];
  const optionalEnv = ['FRONTEND_URL', 'EMAIL_HOST', 'RESEND_API_KEY', 'POSTHOG_API_KEY', 'GEMINI_API_KEY'];
  res.json({
    status: database === 'ok' && storage === 'ok' ? 'ok' : 'degraded',
    database,
    storage,
    env: {
      required: Object.fromEntries(requiredEnv.map(key => [key, Boolean(process.env[key])])),
      optional: Object.fromEntries(optionalEnv.map(key => [key, Boolean(process.env[key])])),
    },
    uptime_seconds: Math.round(startedAt),
  });
});

app.get('/join/:referralCode', (req, res) => {
  const code = String(req.params.referralCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,32}$/.test(code)) {
    return res.status(400).json({ error: 'Invalid referral code' });
  }
  const user = db.prepare('SELECT id FROM users WHERE UPPER(referral_code) = ?').get(code);
  if (!user) return res.status(404).json({ error: 'Referral code not found' });
  const frontend = process.env.FRONTEND_URL || 'https://uask.live';
  res.redirect(302, `${frontend.replace(/\/$/, '')}/signup?ref=${encodeURIComponent(code)}`);
});


app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/keys', keysRoutes);
app.use('/api/help-wanted', helpWantedRoutes);
app.use('/api/time-requests', timeRequestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/saved-tutors', savedTutorsRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/provider-media', providerMediaRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/hangouts', hangoutsRoutes);

startReminderJobs();

process.on('SIGINT', async () => {
  await posthog.shutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await posthog.shutdown();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`ASK API running on http://localhost:${PORT}`);
  // Email health check — visible in Railway logs
  const { EMAIL_HOST, EMAIL_USER, RESEND_API_KEY } = process.env;
  if (EMAIL_HOST && EMAIL_USER) {
    console.log(`✅ Email: SMTP via ${EMAIL_USER}`);
  } else if (RESEND_API_KEY) {
    console.log(`✅ Email: Resend (${process.env.EMAIL_FROM || 'default sender'})`);
  } else {
    console.warn(`⚠️  Email NOT configured — codes will only appear in logs`);
  }
});
