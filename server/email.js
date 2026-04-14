import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { buildICS, googleCalendarUrl } from './calendar.js';

// ── Transport selection ────────────────────────────────────────────────────────
// Priority: Resend (RESEND_API_KEY) → Gmail/SMTP (EMAIL_HOST + creds) → console log

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function getSmtpTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT || '587'),
    secure: parseInt(EMAIL_PORT || '587') === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'ASK Marketplace <noreply@uask.live>';

async function sendEmail({ to, subject, html, attachments }) {
  const resend = getResend();

  if (resend) {
    const payload = { from: FROM_ADDRESS, to, subject, html };
    if (attachments?.length) {
      payload.attachments = attachments.map(a => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
      }));
    }
    await resend.emails.send(payload);
    return;
  }

  const smtp = getSmtpTransporter();
  if (smtp) {
    await smtp.sendMail({ from: FROM_ADDRESS, to, subject, html, attachments });
    return;
  }

  // Dev fallback
  console.log(`\n📧 [EMAIL] To: ${to} | Subject: ${subject}\n`);
}

// ── Shared HTML helpers ────────────────────────────────────────────────────────
function emailWrap(content) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F6F3EF;font-family:system-ui,sans-serif">
    <div style="max-width:520px;margin:40px auto;background:#fff;border:1.5px solid #DDD8D0;border-radius:12px;overflow:hidden">
      <div style="background:#1B4FD8;padding:20px 28px;display:flex;align-items:center;gap:10px">
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:1px">ASK</span>
        <span style="color:rgba(255,255,255,0.6);font-size:13px">Marketplace</span>
      </div>
      <div style="padding:28px 28px 32px">${content}</div>
      <div style="padding:16px 28px;background:#F6F3EF;border-top:1px solid #DDD8D0;font-size:11px;color:#9ca3af">
        You're receiving this because you have an account on <a href="https://uask.live" style="color:#1B4FD8;text-decoration:none">uask.live</a>.
      </div>
    </div>
  </body></html>`;
}

function codeBlock(code) {
  return `<div style="font-size:42px;font-weight:800;letter-spacing:12px;text-align:center;color:#111;background:#F6F3EF;border:1.5px solid #DDD8D0;border-radius:10px;padding:22px 0;margin:24px 0;font-family:monospace">${code}</div>`;
}

function infoRow(label, value, sub) {
  return `<div style="margin-bottom:14px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#9ca3af;margin-bottom:3px">${label}</div>
    <div style="font-size:15px;font-weight:600;color:#111">${value}</div>
    ${sub ? `<div style="font-size:12px;color:#6b7280;margin-top:1px">${sub}</div>` : ''}
  </div>`;
}

function infoCard(...rows) {
  return `<div style="background:#F6F3EF;border:1.5px solid #DDD8D0;border-radius:10px;padding:18px 20px;margin:20px 0">${rows.join('')}</div>`;
}

function btn(href, label, color = '#1B4FD8') {
  return `<a href="${href}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:${color};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;margin-right:8px;margin-bottom:8px">${label}</a>`;
}

// ── Email functions ────────────────────────────────────────────────────────────

export async function sendVerificationCode(toEmail, code) {
  await sendEmail({
    to: toEmail,
    subject: 'Your ASK verification code',
    html: emailWrap(`
      <h2 style="margin:0 0 6px;font-size:22px;color:#111">Verify your email</h2>
      <p style="margin:0 0 4px;color:#6b7280;font-size:14px">Enter this code to complete your sign-up.</p>
      ${codeBlock(code)}
      <p style="margin:0;color:#9ca3af;font-size:12px">Expires in 10 minutes. Didn't request this? Ignore it.</p>
    `),
  });
}

export async function sendPasswordResetCode(toEmail, code) {
  await sendEmail({
    to: toEmail,
    subject: 'Reset your ASK password',
    html: emailWrap(`
      <h2 style="margin:0 0 6px;font-size:22px;color:#111">Reset your password</h2>
      <p style="margin:0 0 4px;color:#6b7280;font-size:14px">Enter this code to set a new password.</p>
      ${codeBlock(code)}
      <p style="margin:0;color:#9ca3af;font-size:12px">Expires in 10 minutes. Didn't request this? Ignore it.</p>
    `),
  });
}

export async function sendBookingNotification({ providerEmail, providerName, studentName, studentEmail, date, startTime, endTime }) {
  await sendEmail({
    to: providerEmail,
    subject: `New booking from ${studentName}`,
    html: emailWrap(`
      <h2 style="margin:0 0 6px;font-size:22px;color:#111">You got a booking!</h2>
      <p style="margin:0 0 4px;color:#6b7280;font-size:14px">Someone just booked a session with you on ASK.</p>
      ${infoCard(
        infoRow('Student', studentName, studentEmail),
        infoRow('Session', date, `${startTime}–${endTime}`)
      )}
      ${btn('https://uask.live/dashboard/provider', 'View in Dashboard')}
    `),
  });
}

export async function sendBookingConfirmation({ studentEmail, studentName, providerName, date, startTime, endTime, bookingId }) {
  const calTitle = `Session with ${providerName}`;
  const calDesc  = `Booked via uask.live.`;
  const gCalUrl  = googleCalendarUrl({ title: calTitle, description: calDesc, slotDate: date, startTime, endTime });
  const icsData  = buildICS({ title: calTitle, description: calDesc, slotDate: date, startTime, endTime, uid: `booking-${bookingId}@uask.live`, url: 'https://uask.live/dashboard/student' });

  await sendEmail({
    to: studentEmail,
    subject: `Your session with ${providerName} is confirmed`,
    html: emailWrap(`
      <h2 style="margin:0 0 6px;font-size:22px;color:#111">You're all set!</h2>
      <p style="margin:0 0 4px;color:#6b7280;font-size:14px">${providerName} confirmed your session.</p>
      ${infoCard(
        infoRow('Provider', providerName),
        infoRow('Session', date, `${startTime}–${endTime}`)
      )}
      <div style="margin-bottom:16px">
        ${btn(gCalUrl, '📅 Google Calendar', '#4285F4')}
        ${btn(`https://uask.live/api/bookings/${bookingId}/ics`, ' Apple Calendar', '#111')}
      </div>
      <p style="margin:0;color:#9ca3af;font-size:12px">The .ics file attached also works with Outlook and any calendar app.</p>
    `),
    attachments: [{
      filename: 'session.ics',
      content: icsData,
      contentType: 'text/calendar; charset=UTF-8; method=REQUEST',
    }],
  });
}

export async function sendProviderConfirmationCopy({ providerEmail, providerName, studentName, studentEmail, date, startTime, endTime, bookingId }) {
  const calTitle = `Session with ${studentName}`;
  const calDesc  = `Student: ${studentName} (${studentEmail}). Manage at https://uask.live/dashboard/provider`;
  const gCalUrl  = googleCalendarUrl({ title: calTitle, description: calDesc, slotDate: date, startTime, endTime });
  const icsData  = buildICS({ title: calTitle, description: calDesc, slotDate: date, startTime, endTime, uid: `booking-${bookingId}-provider@uask.live`, url: 'https://uask.live/dashboard/provider' });

  await sendEmail({
    to: providerEmail,
    subject: `Session confirmed with ${studentName} — ${date} ${startTime}–${endTime}`,
    html: emailWrap(`
      <h2 style="margin:0 0 6px;font-size:22px;color:#111">Session confirmed!</h2>
      <p style="margin:0 0 4px;color:#6b7280;font-size:14px">Here's a reminder of your upcoming session.</p>
      ${infoCard(
        infoRow('Student', studentName, studentEmail),
        infoRow('Session', date, `${startTime}–${endTime}`)
      )}
      ${btn(gCalUrl, '📅 Google Calendar', '#4285F4')}
    `),
    attachments: [{
      filename: 'session.ics',
      content: icsData,
      contentType: 'text/calendar; charset=UTF-8; method=REQUEST',
    }],
  });
}
