import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import providerRoutes from './routes/providers.js';
import availabilityRoutes from './routes/availability.js';
import bookingRoutes from './routes/bookings.js';
import reviewRoutes from './routes/reviews.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);

app.listen(PORT, () => console.log(`ASK API running on http://localhost:${PORT}`));
