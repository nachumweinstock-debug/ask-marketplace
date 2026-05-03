import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { trustForProvider } from '../trust.js';

const router = Router();

router.get('/provider/:id', (req, res) => {
  const trust = trustForProvider(req.params.id);
  if (!trust) return res.status(404).json({ error: 'Provider not found' });
  res.json(trust);
});

router.get('/provider/:id/analytics', requireAuth, (req, res) => {
  const provider = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  if (provider.user_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Forbidden' });

  const trust = trustForProvider(provider.id);
  const views = db.prepare(`
    SELECT COUNT(*) as n
    FROM analytics_events
    WHERE event_name = 'tutor_profile_viewed'
      AND json_extract(metadata, '$.provider_id') = ?
  `).get(provider.id).n || 0;
  const clicks = db.prepare(`
    SELECT COUNT(*) as n
    FROM analytics_events
    WHERE event_name = 'tutor_card_clicked'
      AND json_extract(metadata, '$.provider_id') = ?
  `).get(provider.id).n || 0;
  const bookings = db.prepare(`
    SELECT strftime('%Y-%W', created_at) as week, COUNT(*) as bookings
    FROM bookings
    WHERE provider_id = ?
    GROUP BY strftime('%Y-%W', created_at)
    ORDER BY week DESC
    LIMIT 10
  `).all(provider.id).reverse();
  const completed = trust.completed_sessions || 0;
  const avgPrice = Number(provider.price_per_session || 0);
  res.json({
    trust,
    kpis: {
      profile_views: views,
      listing_clicks: clicks,
      booking_conversion_rate: views ? Math.round((trust.booking_count / views) * 100) : 0,
      sessions_completed: completed,
      repeat_students: trust.repeat_students,
      average_rating: trust.average_review_rating,
      response_rate: trust.response_rate,
      saved_count: trust.saved_count,
      earnings_estimate: completed * avgPrice,
    },
    bookings_by_week: bookings,
  });
});

export default router;
