import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
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
import db from './db.js';
import { startReminderJobs } from './reminders.js';

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
  process.env.FRONTEND_URL,
].filter(Boolean);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image loads from Vercel
  contentSecurityPolicy: false, // handled by Vercel on the frontend
}));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts — please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Too many requests — slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

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

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));


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

startReminderJobs();

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

