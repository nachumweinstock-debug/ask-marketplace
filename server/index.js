import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// DATA_DIR is a persistent volume path in production (e.g. /data on Railway)
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..');
mkdirSync(join(DATA_DIR, 'uploads'), { recursive: true });

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '6mb' }));
app.use('/uploads', express.static(join(DATA_DIR, 'uploads')));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => console.log(`ASK API running on http://localhost:${PORT}`));
