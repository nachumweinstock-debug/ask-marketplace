/**
 * Scheduled reminder jobs — runs every 15 minutes.
 *
 * 1. sms_reminder_sent  — SMS to both provider + student ~1 hr before session
 * 2. sms_review_sent    — SMS to student ~1 hr after session asking to rate
 *
 * Times stored in DB are Eastern (America/New_York).
 * We use toLocaleString('sv-SE', { timeZone: 'America/New_York' }) to get a
 * comparable "YYYY-MM-DD HH:MM" string without any SDK.
 */

import db from './db.js';
import { smsAppointmentReminder, smsReviewReminder } from './sms.js';
import { sendAppointmentReminderEmail, sendReviewReminderEmail, sendDmNotification, sendNoAvailabilityReminderEmail, sendHangoutHostReminder } from './email.js';

// Returns "YYYY-MM-DD HH:MM" in Eastern time, offset by `mins` minutes from now
function easternOffset(mins = 0) {
  const d = new Date(Date.now() + mins * 60 * 1000);
  return d.toLocaleString('sv-SE', { timeZone: 'America/New_York' }).slice(0, 16);
}

async function sendAppointmentReminders() {
  // Window: sessions starting between now+45min and now+75min
  const from = easternOffset(45);
  const to   = easternOffset(75);

  const bookings = db.prepare(`
    SELECT b.id, b.student_id, b.provider_id,
           a.date, a.start_time, a.end_time,
           su.name  AS student_name,  su.phone  AS student_phone,  su.email  AS student_email,
           pu.name  AS provider_name, pu.phone  AS provider_phone, pu.email  AS provider_email
    FROM bookings b
    JOIN availability a       ON a.id  = b.availability_id
    JOIN users su              ON su.id = b.student_id
    JOIN provider_profiles pp  ON pp.id = b.provider_id
    JOIN users pu              ON pu.id = pp.user_id
    WHERE b.status = 'confirmed'
      AND b.sms_reminder_sent = 0
      AND a.date GLOB '????-??-??'
      AND (a.date || ' ' || a.start_time) BETWEEN ? AND ?
  `).all(from, to);

  for (const b of bookings) {
    try {
      await Promise.allSettled([
        // Student — SMS + email
        smsAppointmentReminder({ phone: b.student_phone, otherName: b.provider_name, date: b.date, startTime: b.start_time, role: 'student' }),
        sendAppointmentReminderEmail({ toEmail: b.student_email, toName: b.student_name, otherName: b.provider_name, date: b.date, startTime: b.start_time, endTime: b.end_time, role: 'student', dashboardUrl: 'https://uask.live/dashboard/student' }),
        // Provider — SMS + email
        smsAppointmentReminder({ phone: b.provider_phone, otherName: b.student_name, date: b.date, startTime: b.start_time, role: 'provider' }),
        sendAppointmentReminderEmail({ toEmail: b.provider_email, toName: b.provider_name, otherName: b.student_name, date: b.date, startTime: b.start_time, endTime: b.end_time, role: 'provider', dashboardUrl: 'https://uask.live/dashboard/provider' }),
      ]);
      db.prepare('UPDATE bookings SET sms_reminder_sent = 1 WHERE id = ?').run(b.id);
      console.log(`[REMINDER] 1hr-before sent for booking ${b.id}`);
    } catch (err) {
      console.error(`[REMINDER] before-reminder error booking ${b.id}:`, err.message);
    }
  }
}

async function sendReviewReminders() {
  // Window: sessions that ended between now-75min and now-45min
  const from = easternOffset(-75);
  const to   = easternOffset(-45);

  const bookings = db.prepare(`
    SELECT b.id, b.student_id,
           a.date, a.end_time,
           su.phone AS student_phone, su.email AS student_email, su.name AS student_name,
           pu.name  AS provider_name
    FROM bookings b
    JOIN availability a       ON a.id  = b.availability_id
    JOIN users su              ON su.id = b.student_id
    JOIN provider_profiles pp  ON pp.id = b.provider_id
    JOIN users pu              ON pu.id = pp.user_id
    WHERE b.status = 'confirmed'
      AND b.sms_review_sent = 0
      AND a.date GLOB '????-??-??'
      AND (a.date || ' ' || a.end_time) BETWEEN ? AND ?
  `).all(from, to);

  for (const b of bookings) {
    try {
      await Promise.allSettled([
        smsReviewReminder({ phone: b.student_phone, providerName: b.provider_name, bookingId: b.id }),
        sendReviewReminderEmail({ toEmail: b.student_email, toName: b.student_name, providerName: b.provider_name }),
      ]);
      db.prepare('UPDATE bookings SET sms_review_sent = 1, status = ? WHERE id = ? AND status = ?')
        .run('completed', b.id, 'confirmed');
      console.log(`[REMINDER] review reminder sent for booking ${b.id}`);
    } catch (err) {
      console.error(`[REMINDER] review-reminder error booking ${b.id}:`, err.message);
    }
  }
}

// DM nudge escalation: 1 hour → 24 hours → 7 days after first unread.
// dm_nudge_log tracks which levels have fired so we never re-send the same level.
// The log is cleared when the receiver opens the conversation (dm.js GET /:userId).
const NUDGE_LEVELS = [
  { level: 1, hours: 1,   label: '1hr'  },
  { level: 2, hours: 24,  label: '24hr' },
  { level: 3, hours: 168, label: '7day' },
];

async function sendUnreadDmNudges() {
  for (const { level, hours, label } of NUDGE_LEVELS) {
    // Find conversations where:
    //   - at least one unread non-system message is old enough
    //   - this nudge level hasn't been sent yet
    const rows = db.prepare(`
      SELECT dm.receiver_id, dm.sender_id,
             u_recv.email AS receiver_email, u_recv.name AS receiver_name,
             u_send.name  AS sender_name,
             COUNT(*) AS unread_count
      FROM direct_messages dm
      JOIN users u_recv ON u_recv.id = dm.receiver_id
      JOIN users u_send ON u_send.id = dm.sender_id
      WHERE dm.read_at IS NULL
        AND dm.is_system = 0
        AND dm.created_at <= datetime('now', '-${hours} hours')
        AND NOT EXISTS (
          SELECT 1 FROM dm_nudge_log n
          WHERE n.receiver_id = dm.receiver_id
            AND n.sender_id   = dm.sender_id
            AND n.nudge_level = ${level}
        )
      GROUP BY dm.receiver_id, dm.sender_id
    `).all();

    for (const row of rows) {
      try {
        const preview = level === 1
          ? `You have ${row.unread_count} unread message${row.unread_count > 1 ? 's' : ''} — open ASK to reply.`
          : level === 2
          ? `${row.sender_name} is still waiting for your reply.`
          : `Don't miss it — ${row.sender_name} messaged you a week ago.`;

        await sendDmNotification({
          toEmail:  row.receiver_email,
          toName:   row.receiver_name,
          fromName: row.sender_name,
          preview,
        });

        // Record this level so it doesn't fire again
        db.prepare(
          'INSERT OR REPLACE INTO dm_nudge_log (receiver_id, sender_id, nudge_level) VALUES (?, ?, ?)'
        ).run(row.receiver_id, row.sender_id, level);

        console.log(`[REMINDER] DM nudge ${label} → ${row.receiver_email} from ${row.sender_name}`);
      } catch (err) {
        console.error(`[REMINDER] DM nudge ${label} error:`, err.message);
      }
    }
  }
}

function easternParts() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  return {
    hour: Number(parts.find(p => p.type === 'hour')?.value || 0),
    minute: Number(parts.find(p => p.type === 'minute')?.value || 0),
  };
}

async function sendNoAvailabilityListingReminders() {
  const { hour } = easternParts();
  if (hour !== 7) return;

  const listings = db.prepare(`
    SELECT pp.id, pp.title, pp.category, pp.custom_category, pp.subcategory,
           u.email, u.name, u.username
    FROM provider_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE COALESCE(pp.created_at, datetime('now', '-3 days')) <= datetime('now', '-2 days')
      AND pp.last_no_availability_reminder_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM availability a
        WHERE a.provider_id = pp.id
          AND a.is_booked = 0
          AND (a.date NOT GLOB '[0-9]*' OR a.date >= date('now'))
      )
  `).all();

  for (const listing of listings) {
    try {
      const listingTitle = listing.title || listing.subcategory || listing.custom_category || listing.category || 'ASK';
      await sendNoAvailabilityReminderEmail({
        toEmail: listing.email,
        toName: listing.name,
        listingTitle,
        profileUrl: listing.username ? `https://uask.live/${listing.username}` : `https://uask.live/providers/${listing.id}`,
      });
      db.prepare("UPDATE provider_profiles SET last_no_availability_reminder_at = datetime('now') WHERE id = ?").run(listing.id);
      console.log(`[REMINDER] no-availability reminder sent → ${listing.email} listing ${listing.id}`);
    } catch (err) {
      console.error(`[REMINDER] no-availability reminder error listing ${listing.id}:`, err.message);
    }
  }
}

async function sendHangoutHostReminders() {
  const sessions = db.prepare(`
    SELECT s.id, s.subject, s.location, s.attendee_count, s.expires_at,
           u.email, u.name
    FROM study_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.expires_at > datetime('now')
      AND (s.host_last_reminded_at IS NULL OR s.host_last_reminded_at < datetime('now', '-30 minutes'))
      AND s.created_at < datetime('now', '-5 minutes')
  `).all();

  for (const s of sessions) {
    try {
      await sendHangoutHostReminder({
        toEmail: s.email,
        hostName: s.name,
        subject: s.subject,
        location: s.location,
        attendeeCount: s.attendee_count,
        expiresAt: s.expires_at,
      });
      db.prepare(`UPDATE study_sessions SET host_last_reminded_at = datetime('now') WHERE id = ?`).run(s.id);
    } catch (e) {
      console.error('[REMINDER] hangout host reminder error:', e.message);
    }
  }
}

export function startReminderJobs() {
  const run = () => {
    sendAppointmentReminders().catch(e => console.error('[REMINDER] before job error:', e.message));
    sendReviewReminders().catch(e => console.error('[REMINDER] review job error:', e.message));
    sendUnreadDmNudges().catch(e => console.error('[REMINDER] DM nudge error:', e.message));
    sendNoAvailabilityListingReminders().catch(e => console.error('[REMINDER] no-availability job error:', e.message));
    sendHangoutHostReminders().catch(e => console.error('[REMINDER] hangout host reminder error:', e.message));
  };

  // Run once at startup, then every 15 minutes
  run();
  setInterval(run, 15 * 60 * 1000);
  console.log('✅ Reminder jobs started (every 15 min)');
}
