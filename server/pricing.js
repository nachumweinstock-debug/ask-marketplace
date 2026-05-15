import db from './db.js';

const SITEWIDE_FIRST_TIME_DISCOUNT_KEY = 'sitewide_first_time_discount_percent';
const SITEWIDE_SURGE_PRICING_KEY = 'sitewide_surge_pricing_percent';

export function getSurgePricingPercent() {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(SITEWIDE_SURGE_PRICING_KEY);
  const percent = Number(row?.value || 0);
  return percent === 15 ? 15 : 0;
}

export function setSurgePricingPercent(percent) {
  const normalized = Number(percent) === 15 ? 15 : 0;
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(SITEWIDE_SURGE_PRICING_KEY, String(normalized));
  return normalized;
}

export function getSitewideFirstTimeDiscountPercent() {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(SITEWIDE_FIRST_TIME_DISCOUNT_KEY);
  const percent = Number(row?.value || 0);
  return percent === 15 ? 15 : 0;
}

export function setSitewideFirstTimeDiscountPercent(percent) {
  const normalized = Number(percent) === 15 ? 15 : 0;
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(SITEWIDE_FIRST_TIME_DISCOUNT_KEY, String(normalized));
  return normalized;
}

export function isFirstTimeStudent(userId) {
  if (!userId) return true;
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM bookings
    WHERE student_id = ? AND status != 'cancelled'
  `).get(userId);
  return Number(row?.count || 0) === 0;
}

export function effectiveFirstTimeDiscountPercent(listing, userId) {
  const sitewide = getSitewideFirstTimeDiscountPercent();
  if (sitewide) return sitewide;
  if (!isFirstTimeStudent(userId)) return 0;
  const listingPercent = Number(listing?.first_time_discount_percent || 0);
  return Math.max(sitewide, listingPercent === 15 || listingPercent === 20 ? listingPercent : 0);
}

export function effectiveBookingDiscountPercent(listing, isFirstBooking = false) {
  const sitewide = getSitewideFirstTimeDiscountPercent();
  if (sitewide) return sitewide;
  const listingPercent = Number(listing?.first_time_discount_percent || 0);
  return isFirstBooking && (listingPercent === 15 || listingPercent === 20) ? listingPercent : 0;
}

export function withEffectiveFirstTimeDiscount(listing, userId) {
  const sitewide = getSitewideFirstTimeDiscountPercent();
  const surgePercent = getSurgePricingPercent();
  const percent = effectiveFirstTimeDiscountPercent(listing, userId);
  const rawPrice = Number(listing.price_per_session || 0);
  const surgedPrice = rawPrice > 0 && surgePercent > 0
    ? Math.round(rawPrice * (100 + surgePercent)) / 100
    : rawPrice;
  return {
    ...listing,
    base_price_per_session: rawPrice,
    price_per_session: surgedPrice,
    surge_percent: surgePercent,
    first_time_discount_percent: percent,
    first_time_discount_eligible: percent > 0,
    first_time_discount_scope: sitewide && percent === sitewide ? 'sitewide' : (percent > 0 ? 'first_time' : null),
  };
}
