import db from './db.js';

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function minutesBetween(a, b) {
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Number.isFinite(diff) && diff > 0 ? Math.round(diff / 60000) : null;
}

export function trustForProvider(providerId) {
  const provider = db.prepare(`
    SELECT pp.*, u.created_at as joined_at, u.last_active_at, u.is_admin, u.university
    FROM provider_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE pp.id = ?
  `).get(providerId);
  if (!provider) return null;

  const bookings = db.prepare('SELECT * FROM bookings WHERE provider_id = ?').all(providerId);
  const completed = bookings.filter(b => b.status === 'completed').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;
  const confirmedOrDone = bookings.filter(b => ['confirmed', 'completed'].includes(b.status)).length;
  const uniqueStudents = new Set(bookings.map(b => b.student_id)).size;
  const repeatStudents = db.prepare(`
    SELECT COUNT(*) as n FROM (
      SELECT student_id
      FROM bookings
      WHERE provider_id = ? AND status IN ('confirmed','completed')
      GROUP BY student_id
      HAVING COUNT(*) > 1
    )
  `).get(providerId).n || 0;
  const savedCount = db.prepare('SELECT COUNT(*) as n FROM saved_tutors WHERE tutor_id = ?').get(providerId).n || 0;
  const reportCount = db.prepare(`
    SELECT COUNT(*) as n
    FROM review_reports rr
    JOIN reviews r ON r.id = rr.review_id
    WHERE r.provider_id = ? AND rr.status IN ('open','hidden')
  `).get(providerId).n || 0;
  const reviewStats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as n FROM reviews WHERE provider_id = ? AND COALESCE(hidden,0) = 0').get(providerId);

  const inbound = db.prepare(`
    SELECT dm.*
    FROM direct_messages dm
    WHERE dm.receiver_id = ? AND dm.is_system = 0
    ORDER BY dm.created_at ASC
  `).all(provider.user_id);
  const outbound = db.prepare(`
    SELECT dm.*
    FROM direct_messages dm
    WHERE dm.sender_id = ? AND dm.is_system = 0
    ORDER BY dm.created_at ASC
  `).all(provider.user_id);
  let responded = 0;
  let responseMinutes = [];
  for (const msg of inbound) {
    const reply = outbound.find(out => out.receiver_id === msg.sender_id && new Date(out.created_at) > new Date(msg.created_at));
    if (reply) {
      responded += 1;
      const mins = minutesBetween(msg.created_at, reply.created_at);
      if (mins !== null) responseMinutes.push(mins);
    }
  }
  const avgResponseMinutes = responseMinutes.length
    ? Math.round(responseMinutes.reduce((a, b) => a + b, 0) / responseMinutes.length)
    : null;

  const rating = Math.round((reviewStats.avg || provider.rating || 0) * 10) / 10;
  const labels = [];
  if (rating >= 4.8 && (reviewStats.n || provider.review_count) >= 3) labels.push('Top Rated');
  if (bookings.length >= 3 && pct(completed, bookings.length) >= 70 && pct(cancelled, bookings.length) <= 15) labels.push('Reliable Tutor');
  if (inbound.length > 0 && pct(responded, inbound.length) >= 80) labels.push('Fast Responder');
  if (confirmedOrDone >= 5 || savedCount >= 5) labels.push('Highly Booked');
  if (bookings.length < 2 && (reviewStats.n || 0) < 2) labels.push('New Tutor');

  return {
    response_rate: pct(responded, inbound.length),
    average_response_minutes: avgResponseMinutes,
    average_response_time: avgResponseMinutes == null ? 'Not enough data' : avgResponseMinutes < 60 ? `${avgResponseMinutes}m` : `${Math.round(avgResponseMinutes / 60)}h`,
    cancellation_rate: pct(cancelled, bookings.length),
    no_show_rate: 0,
    repeat_bookings: confirmedOrDone - uniqueStudents,
    repeat_students: repeatStudents,
    repeat_student_percentage: pct(repeatStudents, uniqueStudents),
    average_review_rating: rating,
    completed_sessions: completed,
    report_count: reportCount,
    saved_count: savedCount,
    booking_count: bookings.length,
    verified: !!provider.is_admin || !!provider.school_verified || completed > 0 || (reviewStats.n || 0) > 0,
    school_verified: !!provider.school_verified,
    joined_at: provider.joined_at,
    last_active_at: provider.last_active_at,
    labels,
  };
}

export function attachTrust(row) {
  const trust = trustForProvider(row.id);
  return { ...row, trust, trust_labels: trust?.labels || [] };
}
