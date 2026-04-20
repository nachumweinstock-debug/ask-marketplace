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
import { sendAppointmentReminderEmail, sendReviewReminderEmail } from './email.js';

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

export function startReminderJobs() {
  const run = () => {
    sendAppointmentReminders().catch(e => console.error('[REMINDER] before job error:', e.message));
    sendReviewReminders().catch(e => console.error('[REMINDER] review job error:', e.message));
  };

  // Run once at startup, then every 15 minutes
  run();
  setInterval(run, 15 * 60 * 1000);
  console.log('✅ Reminder jobs started (every 15 min)');
}
