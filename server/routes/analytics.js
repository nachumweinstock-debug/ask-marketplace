import { Router } from 'express';
import db from '../db.js';
import { optionalAuth, requireAuth } from '../auth.js';

const router = Router();
const DEVELOPER_ADMIN_EMAIL = 'nachumweinstock@gmail.com';

const CONVERSION_EVENTS = new Set([
  'signup_started',
  'signup_completed',
  'contact_tutor_clicked',
  'booking_started',
  'booking_completed',
  'become_tutor_clicked',
  'tutor_application_started',
  'tutor_application_submitted',
]);

function requireAdmin(req, res, next) {
  const u = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!u?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

function requireDeveloperAdmin(req, res, next) {
  if (req.user?.email?.toLowerCase() !== DEVELOPER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Developer admin only' });
  }
  next();
}

function cleanString(value, max = 500) {
  if (value === undefined || value === null) return null;
  return String(value).slice(0, max);
}

function cleanJson(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '{}';
  const blocked = /password|token|secret|code|email|phone|zelle|venmo/i;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (blocked.test(key)) continue;
    if (typeof val === 'string') out[key] = val.slice(0, 300);
    else if (typeof val === 'number' || typeof val === 'boolean') out[key] = val;
    else if (val === null) out[key] = null;
  }
  return JSON.stringify(out);
}

function classifyPage(path = '/') {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (clean === '/') return 'homepage';
  if (/^\/schools\/[^/]+\/[^/]+$/.test(clean)) return 'school-subject page';
  if (/^\/schools\/[^/]+$/.test(clean)) return 'school page';
  if (/^\/subjects\/[^/]+$/.test(clean)) return 'subject page';
  if (/^\/tutors\/[^/]+$/.test(clean)) return 'tutor profile';
  if (/^\/blog\/[^/]+$/.test(clean)) return 'blog';
  if (/^\/(login|signup|forgot-password|reset-password|auth)/.test(clean)) return 'auth';
  if (/^\/(dashboard|account|admin|messages|chat)/.test(clean)) return 'dashboard';
  if (clean === '/browse' || clean === '/tutors') return 'marketplace';
  if (clean === '/create-listing' || clean === '/become-a-tutor') return 'tutor application';
  return 'other';
}

function sourceFrom(referrer, utmSource) {
  if (utmSource) return utmSource;
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (/google\./i.test(host)) return 'google';
    if (/bing\./i.test(host)) return 'bing';
    if (/instagram|facebook|tiktok|linkedin|x\.com|twitter/i.test(host)) return 'social';
    if (/uask\.live$/i.test(host)) return 'internal';
    return host;
  } catch {
    return 'referral';
  }
}

function rangeWhere(range = '30d', tableAlias = '') {
  const col = `${tableAlias ? `${tableAlias}.` : ''}created_at`;
  const map = {
    today: `date(${col}) = date('now')`,
    '7d': `${col} >= datetime('now', '-7 days')`,
    '30d': `${col} >= datetime('now', '-30 days')`,
    '90d': `${col} >= datetime('now', '-90 days')`,
    all: '1=1',
  };
  return map[range] || map['30d'];
}

function addFilters(base, params, alias = '') {
  const prefix = alias ? `${alias}.` : '';
  const clauses = [base];
  const values = [];
  for (const [queryKey, column] of [
    ['pageType', 'page_type'],
    ['device', 'device_type'],
  ]) {
    if (params[queryKey] && params[queryKey] !== 'all') {
      clauses.push(`${prefix}${column} = ?`);
      values.push(params[queryKey]);
    }
  }
  if (params.source && params.source !== 'all') {
    if (params.source === 'direct') {
      clauses.push(`(${prefix}utm_source IS NULL OR ${prefix}utm_source = '') AND (${prefix}referrer IS NULL OR ${prefix}referrer = '')`);
    } else {
      clauses.push(`(${prefix}utm_source = ? OR ${prefix}referrer LIKE ?)`);
      values.push(params.source, `%${params.source}%`);
    }
  }
  if (params.school && params.school !== 'all') {
    clauses.push(`${prefix}path LIKE ?`);
    values.push(`/schools/${params.school}%`);
  }
  if (params.subject && params.subject !== 'all') {
    clauses.push(`(${prefix}path = ? OR ${prefix}path LIKE ? OR ${prefix}path LIKE ?)`);
    values.push(`/subjects/${params.subject}`, `/subjects/${params.subject}?%`, `/schools/%/${params.subject}%`);
  }
  return { where: clauses.join(' AND '), values };
}

function pct(num, den) {
  return den ? Math.round((num / den) * 1000) / 10 : 0;
}

function avg(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

router.post('/events', optionalAuth, (req, res) => {
  const bodyEvents = Array.isArray(req.body?.events) ? req.body.events : [req.body];
  const events = bodyEvents.slice(0, 25);
  const inserted = [];

  const insertEvent = db.prepare(`
    INSERT INTO analytics_events (
      event_name, visitor_id, session_id, user_id, url, path, page_title, page_type,
      referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      device_type, browser, os, country, region, city, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPageview = db.prepare(`
    INSERT INTO analytics_pageviews (
      visitor_id, session_id, user_id, url, path, page_title, page_type, referrer, landing_page,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term, device_type, browser, os,
      country, region, city, time_on_page_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertConversion = db.prepare(`
    INSERT INTO analytics_conversions (
      conversion_name, visitor_id, session_id, user_id, url, path, page_title, page_type,
      referrer, source, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const upsertSession = db.prepare(`
    INSERT INTO analytics_sessions (
      session_id, visitor_id, user_id, started_at, last_seen_at, landing_page, referrer,
      first_touch_source, last_touch_source, utm_source, utm_medium, utm_campaign,
      utm_content, utm_term, device_type, browser, os, country, region, city,
      pageview_count, event_count, duration_seconds
    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      user_id = COALESCE(excluded.user_id, analytics_sessions.user_id),
      last_seen_at = CURRENT_TIMESTAMP,
      last_touch_source = excluded.last_touch_source,
      event_count = analytics_sessions.event_count + 1,
      pageview_count = analytics_sessions.pageview_count + excluded.pageview_count,
      duration_seconds = MAX(analytics_sessions.duration_seconds, excluded.duration_seconds)
  `);

  const tx = db.transaction(() => {
    for (const event of events) {
      const eventName = cleanString(event.event_name || event.name, 80);
      const visitorId = cleanString(event.visitor_id, 120);
      const sessionId = cleanString(event.session_id, 120);
      if (!eventName || !visitorId || !sessionId) continue;

      const path = cleanString(event.path || '/', 600);
      const referrer = cleanString(event.referrer, 700);
      const utmSource = cleanString(event.utm?.utm_source || event.utm_source, 120);
      const source = sourceFrom(referrer, utmSource);
      const pageType = cleanString(event.page_type || classifyPage(path), 80);
      const userId = req.user?.id || null;
      const geoCountry = cleanString(event.geo?.country || req.get('x-vercel-ip-country') || req.get('cf-ipcountry'), 80);
      const geoRegion = cleanString(event.geo?.region || req.get('x-vercel-ip-country-region'), 120);
      const geoCity = cleanString(event.geo?.city || req.get('x-vercel-ip-city'), 120);
      const duration = Number(event.duration_seconds || event.metadata?.duration_seconds || 0) || 0;
      const pageviewIncrement = eventName === 'page_view' ? 1 : 0;

      upsertSession.run(
        sessionId,
        visitorId,
        userId,
        cleanString(event.landing_page || path, 700),
        referrer,
        source,
        source,
        utmSource,
        cleanString(event.utm?.utm_medium || event.utm_medium, 120),
        cleanString(event.utm?.utm_campaign || event.utm_campaign, 180),
        cleanString(event.utm?.utm_content || event.utm_content, 180),
        cleanString(event.utm?.utm_term || event.utm_term, 180),
        cleanString(event.device?.type || event.device_type, 60),
        cleanString(event.device?.browser || event.browser, 100),
        cleanString(event.device?.os || event.os, 100),
        geoCountry,
        geoRegion,
        geoCity,
        pageviewIncrement,
        duration
      );

      insertEvent.run(
        eventName,
        visitorId,
        sessionId,
        userId,
        cleanString(event.url, 900),
        path,
        cleanString(event.page_title || event.title, 300),
        pageType,
        referrer,
        utmSource,
        cleanString(event.utm?.utm_medium || event.utm_medium, 120),
        cleanString(event.utm?.utm_campaign || event.utm_campaign, 180),
        cleanString(event.utm?.utm_content || event.utm_content, 180),
        cleanString(event.utm?.utm_term || event.utm_term, 180),
        cleanString(event.device?.type || event.device_type, 60),
        cleanString(event.device?.browser || event.browser, 100),
        cleanString(event.device?.os || event.os, 100),
        geoCountry,
        geoRegion,
        geoCity,
        cleanJson(event.metadata)
      );

      if (eventName === 'page_view') {
        insertPageview.run(
          visitorId,
          sessionId,
          userId,
          cleanString(event.url, 900),
          path,
          cleanString(event.page_title || event.title, 300),
          pageType,
          referrer,
          cleanString(event.landing_page || path, 700),
          utmSource,
          cleanString(event.utm?.utm_medium || event.utm_medium, 120),
          cleanString(event.utm?.utm_campaign || event.utm_campaign, 180),
          cleanString(event.utm?.utm_content || event.utm_content, 180),
          cleanString(event.utm?.utm_term || event.utm_term, 180),
          cleanString(event.device?.type || event.device_type, 60),
          cleanString(event.device?.browser || event.browser, 100),
          cleanString(event.device?.os || event.os, 100),
          geoCountry,
          geoRegion,
          geoCity,
          duration
        );
      }

      if (CONVERSION_EVENTS.has(eventName)) {
        insertConversion.run(
          eventName,
          visitorId,
          sessionId,
          userId,
          cleanString(event.url, 900),
          path,
          cleanString(event.page_title || event.title, 300),
          pageType,
          referrer,
          source,
          cleanJson(event.metadata)
        );
      }
      inserted.push(eventName);
    }
  });

  tx();
  res.status(202).json({ ok: true, inserted: inserted.length });
});

router.get('/admin/summary', requireAuth, requireAdmin, requireDeveloperAdmin, (req, res) => {
  const range = req.query.range || '30d';
  const pageviewFilter = addFilters(rangeWhere(range, 'p'), req.query, 'p');
  const eventFilter = addFilters(rangeWhere(range, 'e'), req.query, 'e');
  const sessionWhere = range === 'all'
    ? '1=1'
    : range === 'today'
      ? "date(started_at) = date('now')"
      : `started_at >= datetime('now', '-${range === '7d' ? 7 : range === '90d' ? 90 : 30} days')`;

  const sessions = db.prepare(`SELECT * FROM analytics_sessions WHERE ${sessionWhere}`).all();
  const pageviews = db.prepare(`SELECT * FROM analytics_pageviews p WHERE ${pageviewFilter.where}`).all(...pageviewFilter.values);
  const events = db.prepare(`SELECT * FROM analytics_events e WHERE ${eventFilter.where} ORDER BY e.created_at DESC LIMIT 500`).all(...eventFilter.values);
  const conversions = db.prepare(`SELECT * FROM analytics_conversions WHERE ${rangeWhere(range)}`).all();
  const eventCountRows = db.prepare(`
    SELECT e.event_name, COUNT(*) as count
    FROM analytics_events e
    WHERE ${eventFilter.where}
    GROUP BY e.event_name
  `).all(...eventFilter.values);

  const totalVisitors = new Set(sessions.map((s) => s.visitor_id)).size;
  const uniqueVisitors = new Set(pageviews.map((p) => p.visitor_id)).size;
  const pageviewCount = pageviews.length;
  const sessionCount = sessions.length;
  const avgSessionDuration = avg(sessions.map((s) => Number(s.duration_seconds || 0)));
  const bounceRate = pct(sessions.filter((s) => Number(s.pageview_count || 0) <= 1).length, sessionCount);

  const groupRows = (rows, keyFn) => {
    const map = new Map();
    for (const row of rows) {
      const key = keyFn(row) || 'unknown';
      const item = map.get(key) || { key, views: 0, visitors: new Set(), sessions: new Set(), events: 0, conversions: 0, referrers: new Map(), duration: [] };
      item.views += row.path ? 1 : 0;
      item.visitors.add(row.visitor_id);
      item.sessions.add(row.session_id);
      if (row.referrer) item.referrers.set(row.referrer, (item.referrers.get(row.referrer) || 0) + 1);
      if (row.time_on_page_seconds) item.duration.push(Number(row.time_on_page_seconds));
      map.set(key, item);
    }
    return [...map.values()];
  };

  const topPages = groupRows(pageviews, (p) => p.path).map((p) => ({
    url: p.key,
    title: pageviews.find((row) => row.path === p.key)?.page_title || p.key,
    page_type: pageviews.find((row) => row.path === p.key)?.page_type || classifyPage(p.key),
    views: p.views,
    unique_visitors: p.visitors.size,
    avg_time_on_page: avg(p.duration),
    top_referrers: [...p.referrers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([referrer, count]) => ({ referrer, count })),
  })).sort((a, b) => b.views - a.views);

  const conversionByPath = new Map();
  for (const c of conversions) conversionByPath.set(c.path, (conversionByPath.get(c.path) || 0) + 1);
  for (const page of topPages) {
    page.conversions = conversionByPath.get(page.url) || 0;
    page.conversion_rate = pct(page.conversions, page.unique_visitors);
    page.bounce_rate = bounceRate;
  }

  const trafficByDay = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as pageviews, COUNT(DISTINCT visitor_id) as visitors
    FROM analytics_pageviews
    WHERE ${rangeWhere(range)}
    GROUP BY date(created_at)
    ORDER BY day ASC
  `).all();

  const topReferrers = db.prepare(`
    SELECT COALESCE(NULLIF(referrer, ''), 'direct') as referrer, COUNT(*) as visits
    FROM analytics_pageviews
    WHERE ${rangeWhere(range)}
    GROUP BY COALESCE(NULLIF(referrer, ''), 'direct')
    ORDER BY visits DESC
    LIMIT 20
  `).all();

  const trafficByDevice = db.prepare(`
    SELECT COALESCE(device_type, 'unknown') as device, COUNT(*) as pageviews, COUNT(DISTINCT visitor_id) as visitors
    FROM analytics_pageviews
    WHERE ${rangeWhere(range)}
    GROUP BY COALESCE(device_type, 'unknown')
    ORDER BY pageviews DESC
  `).all();

  const trafficByGeo = db.prepare(`
    SELECT COALESCE(country, 'unknown') as country, COALESCE(region, '') as region, COALESCE(city, '') as city,
           COUNT(*) as pageviews, COUNT(DISTINCT visitor_id) as visitors
    FROM analytics_pageviews
    WHERE ${rangeWhere(range)}
    GROUP BY country, region, city
    ORDER BY pageviews DESC
    LIMIT 25
  `).all();

  const seoTypes = new Set(['school page', 'subject page', 'school-subject page', 'tutor profile', 'blog']);
  const seoLandingPages = topPages.filter((p) => seoTypes.has(p.page_type));
  const organicSearchTraffic = pageviews.filter((p) => /google|bing|duckduckgo|yahoo/i.test(p.referrer || '')).length;
  const googleReferralTraffic = pageviews.filter((p) => /google\./i.test(p.referrer || '')).length;

  const eventCounts = Object.fromEntries(eventCountRows.map((row) => [row.event_name, row.count]));
  const funnel = [
    { step: 'Landing page visit', count: pageviews.filter((p) => p.landing_page === p.path || p.page_type !== 'dashboard').length },
    { step: 'Tutor search', count: eventCounts.search_started || 0 },
    { step: 'Tutor profile view', count: eventCounts.tutor_profile_viewed || 0 },
    { step: 'Contact/book tutor', count: (eventCounts.contact_tutor_clicked || 0) + (eventCounts.booking_started || 0) },
    { step: 'Signup', count: eventCounts.signup_completed || 0 },
  ];
  const tutorFunnel = [
    { step: 'Landing page visit', count: pageviewCount },
    { step: 'Become a tutor click', count: eventCounts.become_tutor_clicked || 0 },
    { step: 'Application started', count: eventCounts.tutor_application_started || 0 },
    { step: 'Application submitted', count: eventCounts.tutor_application_submitted || 0 },
  ];
  const scalar = (sql, ...values) => db.prepare(sql).pluck().get(...values) || 0;
  const rangeSql = rangeWhere(range);
  const bookingRangeSql = rangeWhere(range, 'b');
  const userRangeSql = rangeWhere(range, 'u');
  const messageRangeSql = rangeWhere(range, 'dm');

  const bookingsByStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM bookings b
    WHERE ${bookingRangeSql}
    GROUP BY status
  `).all();
  const bookingStatus = Object.fromEntries(bookingsByStatus.map((row) => [row.status, row.count]));
  const signupsByDay = db.prepare(`
    SELECT date(u.created_at) as day, COUNT(*) as signups
    FROM users u
    WHERE ${userRangeSql}
    GROUP BY date(u.created_at)
    ORDER BY day ASC
  `).all();
  const bookingsByDay = db.prepare(`
    SELECT date(b.created_at) as day, COUNT(*) as bookings
    FROM bookings b
    WHERE ${bookingRangeSql}
    GROUP BY date(b.created_at)
    ORDER BY day ASC
  `).all();
  const recentSignups = db.prepare(`
    SELECT id, name, email, role, username, created_at
    FROM users
    ORDER BY datetime(created_at) DESC
    LIMIT 12
  `).all();
  const recentBookings = db.prepare(`
    SELECT b.id, b.status, b.created_at, a.date, a.start_time, a.end_time,
           student.name as student_name, provider_user.name as provider_name,
           pp.category, pp.custom_category, pp.subcategory, pp.price_per_session
    FROM bookings b
    JOIN users student ON student.id = b.student_id
    JOIN provider_profiles pp ON pp.id = b.provider_id
    JOIN users provider_user ON provider_user.id = pp.user_id
    LEFT JOIN availability a ON a.id = b.availability_id
    ORDER BY datetime(b.created_at) DESC
    LIMIT 15
  `).all();
  const pendingBookings = db.prepare(`
    SELECT b.id, b.created_at, a.date, a.start_time,
           student.name as student_name, provider_user.name as provider_name,
           pp.category, pp.custom_category, pp.subcategory
    FROM bookings b
    JOIN users student ON student.id = b.student_id
    JOIN provider_profiles pp ON pp.id = b.provider_id
    JOIN users provider_user ON provider_user.id = pp.user_id
    LEFT JOIN availability a ON a.id = b.availability_id
    WHERE b.status = 'pending'
    ORDER BY datetime(b.created_at) ASC
    LIMIT 12
  `).all();
  const pendingTimeRequests = db.prepare(`
    SELECT tr.id, tr.created_at, tr.requested_date, tr.requested_time,
           student.name as student_name, provider_user.name as provider_name,
           pp.category, pp.custom_category, pp.subcategory
    FROM time_requests tr
    JOIN users student ON student.id = tr.student_id
    JOIN provider_profiles pp ON pp.id = tr.provider_id
    JOIN users provider_user ON provider_user.id = pp.user_id
    WHERE tr.status = 'pending'
    ORDER BY datetime(tr.created_at) ASC
    LIMIT 12
  `).all();
  const openHelpWanted = db.prepare(`
    SELECT hw.id, hw.title, hw.category, hw.budget, hw.urgency, hw.created_at, u.name as user_name
    FROM help_wanted hw
    JOIN users u ON u.id = hw.user_id
    WHERE hw.status = 'open'
    ORDER BY datetime(hw.created_at) DESC
    LIMIT 12
  `).all();
  const topProviders = db.prepare(`
    SELECT pp.id, provider_user.name, pp.category, pp.custom_category, pp.subcategory,
           pp.rating, pp.review_count, pp.price_per_session,
           COUNT(b.id) as bookings,
           SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
           SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM provider_profiles pp
    JOIN users provider_user ON provider_user.id = pp.user_id
    LEFT JOIN bookings b ON b.provider_id = pp.id
    GROUP BY pp.id
    ORDER BY bookings DESC, pp.review_count DESC, pp.rating DESC
    LIMIT 12
  `).all();
  const topCategories = db.prepare(`
    SELECT COALESCE(NULLIF(pp.custom_category, ''), NULLIF(pp.subcategory, ''), pp.category, 'Other') as category,
           COUNT(DISTINCT pp.id) as listings,
           COUNT(b.id) as bookings
    FROM provider_profiles pp
    LEFT JOIN bookings b ON b.provider_id = pp.id
    GROUP BY category
    ORDER BY bookings DESC, listings DESC
    LIMIT 12
  `).all();

  const business = {
    kpis: {
      signups_today: scalar("SELECT COUNT(*) FROM users WHERE date(created_at) = date('now')"),
      signups_range: scalar(`SELECT COUNT(*) FROM users u WHERE ${userRangeSql}`),
      total_users: scalar('SELECT COUNT(*) FROM users'),
      provider_accounts: scalar("SELECT COUNT(DISTINCT user_id) FROM provider_profiles"),
      listings: scalar('SELECT COUNT(*) FROM provider_profiles'),
      bookings_today: scalar("SELECT COUNT(*) FROM bookings WHERE date(created_at) = date('now')"),
      bookings_range: scalar(`SELECT COUNT(*) FROM bookings b WHERE ${bookingRangeSql}`),
      bookings_total: scalar('SELECT COUNT(*) FROM bookings'),
      pending_bookings: scalar("SELECT COUNT(*) FROM bookings WHERE status = 'pending'"),
      confirmed_bookings: scalar("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'"),
      completed_bookings: scalar("SELECT COUNT(*) FROM bookings WHERE status = 'completed'"),
      cancelled_bookings: scalar("SELECT COUNT(*) FROM bookings WHERE status = 'cancelled'"),
      booking_value_range: scalar(`
        SELECT COALESCE(SUM(pp.price_per_session), 0)
        FROM bookings b
        JOIN provider_profiles pp ON pp.id = b.provider_id
        WHERE ${bookingRangeSql} AND b.status IN ('pending','confirmed','completed')
      `),
      messages_range: scalar(`SELECT COUNT(*) FROM direct_messages dm WHERE ${messageRangeSql}`),
      unread_dms: scalar('SELECT COUNT(*) FROM direct_messages WHERE read_at IS NULL'),
      pending_time_requests: scalar("SELECT COUNT(*) FROM time_requests WHERE status = 'pending'"),
      open_help_wanted: scalar("SELECT COUNT(*) FROM help_wanted WHERE status = 'open'"),
      available_slots: scalar("SELECT COUNT(*) FROM availability WHERE is_booked = 0"),
      reviews_total: scalar('SELECT COUNT(*) FROM reviews'),
      average_rating: Math.round((scalar('SELECT COALESCE(AVG(rating), 0) FROM reviews') || 0) * 10) / 10,
      booking_conversion_rate: pct(scalar(`SELECT COUNT(*) FROM bookings b WHERE ${bookingRangeSql}`), Math.max(1, scalar(`SELECT COUNT(DISTINCT visitor_id) FROM analytics_pageviews WHERE ${rangeSql}`))),
    },
    bookingStatus,
    signupsByDay,
    bookingsByDay,
    recentSignups,
    recentBookings,
    pendingBookings,
    pendingTimeRequests,
    openHelpWanted,
    topProviders,
    topCategories,
  };

  res.json({
    business,
    kpis: {
      total_visitors: totalVisitors,
      unique_visitors: uniqueVisitors,
      pageviews: pageviewCount,
      sessions: sessionCount,
      average_session_duration: avgSessionDuration,
      bounce_rate: bounceRate,
      organic_search_traffic: organicSearchTraffic,
      google_referral_traffic: googleReferralTraffic,
      conversions: conversions.length,
    },
    trafficByDay,
    trafficByDevice,
    trafficByGeo,
    topPages: topPages.slice(0, 50),
    topReferrers,
    seo: {
      topLandingPages: seoLandingPages.slice(0, 25),
      schoolPages: topPages.filter((p) => p.page_type === 'school page').slice(0, 25),
      subjectPages: topPages.filter((p) => p.page_type === 'subject page').slice(0, 25),
      schoolSubjectPages: topPages.filter((p) => p.page_type === 'school-subject page').slice(0, 25),
      tutorPages: topPages.filter((p) => p.page_type === 'tutor profile').slice(0, 25),
      blogPages: topPages.filter((p) => p.page_type === 'blog').slice(0, 25),
      organicSearchTraffic,
      googleReferralTraffic,
      searchQueries: [],
    },
    funnel,
    tutorFunnel,
    eventCounts,
    eventLog: events.slice(0, 100).map((e) => ({
      id: e.id,
      event_name: e.event_name,
      created_at: e.created_at,
      path: e.path,
      page_type: e.page_type,
      source: sourceFrom(e.referrer, e.utm_source),
      device_type: e.device_type,
      metadata: e.metadata ? JSON.parse(e.metadata) : {},
    })),
    filters: {
      pageTypes: [...new Set(pageviews.map((p) => p.page_type).filter(Boolean))],
      sources: [...new Set(pageviews.map((p) => sourceFrom(p.referrer, p.utm_source)).filter(Boolean))],
      devices: [...new Set(pageviews.map((p) => p.device_type).filter(Boolean))],
      schools: [...new Set(pageviews.map((p) => p.path?.match(/^\/schools\/([^/?]+)/)?.[1]).filter(Boolean))],
      subjects: [...new Set(pageviews.map((p) => (
        p.path?.match(/^\/subjects\/([^/?]+)/)?.[1] ||
        p.path?.match(/^\/schools\/[^/]+\/([^/?]+)/)?.[1]
      )).filter(Boolean))],
    },
  });
});

export default router;
