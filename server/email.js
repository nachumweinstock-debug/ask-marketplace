import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { buildICS, googleCalendarUrl } from './calendar.js';

// ── Transport ──────────────────────────────────────────────────────────────────
//
// Priority order:
//   1. SMTP (Gmail recommended) — set EMAIL_HOST / EMAIL_USER / EMAIL_PASS
//      Gmail: EMAIL_HOST=smtp.gmail.com  EMAIL_PORT=587
//             EMAIL_USER=you@gmail.com   EMAIL_PASS=<16-char App Password>
//      (Gmail > Google Account > Security > 2-Step > App passwords)
//
//   2. Resend — set RESEND_API_KEY + verify uask.live domain on resend.com
//      NOTE: onboarding@resend.dev only delivers to the Resend account owner's email.
//      You MUST verify a domain and set EMAIL_FROM=noreply@uask.live to send to anyone.
//
//   3. Dev fallback — logs to console (code visible in Railway logs)

function getSmtp() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: EMAIL_HOST, port: parseInt(EMAIL_PORT || '587'),
    secure: parseInt(EMAIL_PORT || '587') === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

function getResend() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

const FROM = process.env.EMAIL_FROM || 'ASK Marketplace <onboarding@resend.dev>';
const DEV_ADMIN_EMAIL = 'nachumweinstock@gmail.com';
const ADMIN_EMAILS = [DEV_ADMIN_EMAIL, 'jfeit3@mail.yu.edu'];

function isCodexIdentity(...values) {
  return values
    .filter(Boolean)
    .some(value => /codex|smoke|username-check/i.test(String(value)));
}

function adminRecipientsFor(...values) {
  return isCodexIdentity(...values) ? [DEV_ADMIN_EMAIL] : ADMIN_EMAILS;
}

export function emailConfigStatus() {
  const smtp = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
  const resend = !!process.env.RESEND_API_KEY;
  const from = FROM;
  const sandboxWarning = !smtp && resend && from.includes('onboarding@resend.dev');
  return { smtp, resend, from, sandboxWarning, mode: smtp ? 'smtp' : resend ? 'resend' : 'dev' };
}

async function send({ to, subject, html, attachments }) {
  // SMTP first — if configured AND working
  const smtp = getSmtp();
  if (smtp) {
    try {
      await smtp.sendMail({ from: FROM, to, subject, html, attachments });
      console.log(`[EMAIL] ✅ SMTP → ${to} | ${subject}`);
      return;
    } catch (smtpErr) {
      console.warn(`[EMAIL] ⚠️ SMTP failed → ${to}: ${smtpErr.message} — falling back to Resend`);
    }
  }

  // Resend
  const resend = getResend();
  if (resend) {
    const payload = { from: FROM, to, subject, html };
    if (attachments?.length) {
      payload.attachments = attachments.map(a => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
      }));
    }
    const result = await resend.emails.send(payload);
    if (result.error) {
      console.error(`[EMAIL] ❌ Resend error → ${to} | ${subject}: ${result.error.message}`);
      throw new Error(result.error.message || 'Resend error');
    }
    console.log(`[EMAIL] ✅ Resend → ${to} | ${subject} | id=${result.data?.id}`);
    return;
  }

  // Dev fallback — no email provider configured, log the code so it's usable
  console.log(`[EMAIL] ⚠️ NO PROVIDER — To: ${to} | Subject: ${subject}`);
  console.log(`[EMAIL] ⚠️ HTML: ${html.slice(0, 300)}`);
}

// ── Design system ──────────────────────────────────────────────────────────────
const ORANGE = '#FF5722';
const DARK   = '#111111';
const MUTED  = '#6B7280';
const BORDER = '#E4E4E7';
const BG     = '#F9FAFB';

function shell(preheader, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>ASK Marketplace</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${BG};padding:40px 16px">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;width:100%">

        <!-- Logo -->
        <tr><td style="padding-bottom:28px;text-align:center">
          <a href="https://uask.live" style="text-decoration:none">
            <span style="font-size:26px;font-weight:900;letter-spacing:3px;color:${ORANGE};font-family:Georgia,'Times New Roman',serif">ASK</span>
          </a>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr><td style="height:4px;background:${ORANGE};font-size:0;line-height:0">&nbsp;</td></tr>
            <tr><td>${content}</td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:28px 0 8px;text-align:center">
          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.7">
            ASK Marketplace · <a href="https://uask.live" style="color:#9CA3AF;text-decoration:underline">uask.live</a>
            <br/>You're receiving this because you have an account with ASK.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function header(emoji, title, subtitle) {
  return `
  <div style="background:${DARK};padding:32px 40px 28px">
    ${emoji ? `<div style="font-size:28px;margin-bottom:14px;line-height:1">${emoji}</div>` : ''}
    <h1 style="margin:0 0 8px;font-size:23px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.2px">${title}</h1>
    ${subtitle ? `<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.5">${subtitle}</p>` : ''}
  </div>`;
}

function body(content) {
  return `<div style="padding:32px 40px">${content}</div>`;
}

function divider() {
  return `<div style="height:1px;background:${BORDER};margin:24px 0"></div>`;
}

function codeBlock(code) {
  return `
  <div style="background:${BG};border:1.5px solid ${BORDER};border-radius:12px;padding:28px 20px;margin:24px 0;text-align:center">
    <div style="font-size:48px;font-weight:800;letter-spacing:14px;color:${DARK};font-family:'Courier New',Courier,monospace;line-height:1">${code}</div>
    <div style="font-size:12px;color:${MUTED};margin-top:10px">This code expires in 10 minutes</div>
  </div>`;
}

function infoRow(label, val, sub = '') {
  return `
  <tr>
    <td style="padding:11px 0;border-bottom:1px solid ${BORDER}">
      <div style="font-size:11px;font-weight:600;letter-spacing:0.7px;text-transform:uppercase;color:${MUTED};margin-bottom:4px">${label}</div>
      <div style="font-size:15px;font-weight:600;color:${DARK}">${val}</div>
      ${sub ? `<div style="font-size:13px;color:${MUTED};margin-top:2px">${sub}</div>` : ''}
    </td>
  </tr>`;
}

function infoTable(...rows) {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${BG};border:1px solid ${BORDER};border-radius:12px;padding:4px 20px;margin:20px 0">
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function btn(href, label, color = ORANGE) {
  return `
  <a href="${href}" target="_blank"
    style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;
    padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;
    letter-spacing:0.1px;margin-top:4px;margin-right:8px;margin-bottom:8px">
    ${label}
  </a>`;
}

function note(text) {
  return `<p style="margin:16px 0 0;font-size:12px;color:${MUTED};line-height:1.6">${text}</p>`;
}

// ── Email functions ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(toEmail, toName) {
  await send({
    to: toEmail,
    subject: `Welcome to ASK, ${toName.split(' ')[0]}!`,
    html: shell(`Welcome to ASK Marketplace`, `
      ${header('👋', `Welcome, ${toName.split(' ')[0]}!`, 'Your campus services marketplace account is ready.')}
      ${body(`
        <p style="margin:0 0 16px;font-size:15px;color:${DARK};line-height:1.6">
          You can browse providers, book sessions, and connect with other students — all in one place.
        </p>
        <div>
          ${btn('https://uask.live/browse', 'Browse providers')}
          ${btn('https://uask.live/people', 'Meet people', '#111111')}
        </div>
        ${divider()}
        ${note('Want to offer a service? Head to your dashboard to create a listing.')}
      `)}
    `),
  });
}

export async function sendVerificationCode(toEmail, code) {
  await send({
    to: toEmail,
    subject: `${code} is your ASK verification code`,
    html: shell(`Your verification code is ${code}`, `
      ${header('✉️', 'Verify your email', 'Enter the code below to activate your ASK account.')}
      ${body(`
        <p style="margin:0 0 4px;font-size:15px;color:${DARK};font-weight:500">Here's your one-time code:</p>
        ${codeBlock(code)}
        <p style="margin:0;font-size:14px;color:${MUTED}">Didn't request this? You can safely ignore this email — your account won't be created without verification.</p>
      `)}
    `),
  });
}

export async function sendPasswordResetCode(toEmail, code) {
  await send({
    to: toEmail,
    subject: `${code} — reset your ASK password`,
    html: shell(`Your password reset code is ${code}`, `
      ${header('🔑', 'Reset your password', 'Use the code below to set a new password.')}
      ${body(`
        <p style="margin:0 0 4px;font-size:15px;color:${DARK};font-weight:500">Your reset code:</p>
        ${codeBlock(code)}
        <p style="margin:0;font-size:14px;color:${MUTED}">Didn't request a password reset? Ignore this email — your password won't change.</p>
      `)}
    `),
  });
}

export async function sendAppointmentReminderEmail({ toEmail, toName, otherName, date, startTime, endTime, role, dashboardUrl }) {
  const isProvider = role === 'provider';
  const subject = `Reminder: your session with ${otherName} is in 1 hour`;
  await send({
    to: toEmail,
    subject,
    html: shell(`Your session is coming up in 1 hour`, `
      ${header('⏰', 'Session in 1 hour', `Just a heads-up — you have a session coming up soon.`)}
      ${body(`
        ${infoTable(
          infoRow(isProvider ? 'Student' : 'Provider', otherName),
          infoRow('Date & time', date, `${startTime} – ${endTime}`)
        )}
        ${btn(dashboardUrl || 'https://uask.live', 'Open dashboard')}
      `)}
    `),
  });
}

export async function sendReviewReminderEmail({ toEmail, toName, providerName }) {
  await send({
    to: toEmail,
    subject: `How was your session with ${providerName}?`,
    html: shell(`Rate your session with ${providerName}`, `
      ${header('⭐', 'How did it go?', `Your session with ${providerName} just wrapped up.`)}
      ${body(`
        <p style="margin:0 0 20px;font-size:14px;color:${MUTED};line-height:1.6">
          Taking 10 seconds to leave a rating helps ${providerName} get more bookings and helps other students find great providers.
        </p>
        ${btn('https://uask.live/dashboard/student', '⭐ Leave a rating')}
        ${note('You can rate from your student dashboard under past sessions.')}
      `)}
    `),
  });
}

export async function sendDmNotification({ toEmail, toName, fromName, preview }) {
  await send({
    to: toEmail,
    subject: `${fromName} sent you a message on ASK`,
    html: shell(`New message from ${fromName}`, `
      ${header('💬', `New message from ${fromName}`, `${fromName} messaged you on ASK Marketplace.`)}
      ${body(`
        <div style="background:${BG};border:1px solid ${BORDER};border-radius:10px;padding:16px 20px;margin:0 0 20px">
          <div style="font-size:13px;color:${MUTED};margin-bottom:6px;font-weight:500">${fromName}</div>
          <div style="font-size:15px;color:${DARK};line-height:1.55">${preview}</div>
        </div>
        ${btn('https://uask.live/messages', 'Reply on ASK')}
        ${note('You can turn off email notifications in your account settings.')}
      `)}
    `),
  });
}

export async function sendBookingNotification({ providerEmail, providerName, studentName, studentEmail, date, startTime, endTime }) {
  await send({
    to: providerEmail,
    subject: `New booking request from ${studentName}`,
    html: shell(`${studentName} wants to book a session with you`, `
      ${header('📅', `New booking from ${studentName}`, 'Someone just requested a session with you on ASK.')}
      ${body(`
        ${infoTable(
          infoRow('Student', studentName, studentEmail),
          infoRow('Requested time', date, `${startTime} – ${endTime}`)
        )}
        <p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.6">
          Head to your dashboard to confirm or decline this booking.
        </p>
        ${btn('https://uask.live/dashboard/provider', 'Review booking')}
        ${note('Once you confirm, the student will get a calendar invite automatically.')}
      `)}
    `),
  });
}

export async function sendAdminBookingNotification({ bookingId, providerName, providerEmail, studentName, studentEmail, date, startTime, endTime, listingTitle, category }) {
  await send({
    to: adminRecipientsFor(providerName, providerEmail, studentName, studentEmail, listingTitle, category),
    subject: `New booking on ASK: ${studentName} booked ${providerName}`,
    html: shell(`New ASK booking #${bookingId}`, `
      ${header('📣', `New booking #${bookingId}`, 'A student just booked a session on ASK Marketplace.')}
      ${body(`
        ${infoTable(
          infoRow('Booking ID', bookingId),
          infoRow('Student', studentName, studentEmail),
          infoRow('Provider', providerName, providerEmail),
          infoRow('Listing', listingTitle || category || 'Service', category || ''),
          infoRow('Requested time', date, `${startTime} – ${endTime}`),
          infoRow('Time logged', new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
        )}
        ${btn('https://uask.live/admin', 'Open admin panel')}
      `)}
    `),
  });
}

export async function sendBookingConfirmation({ studentEmail, studentName, providerName, date, startTime, endTime, bookingId, icsToken = '' }) {
  const calTitle = `Session with ${providerName}`;
  const calDesc  = `Booked via ASK Marketplace · uask.live`;
  const gCalUrl  = googleCalendarUrl({ title: calTitle, description: calDesc, slotDate: date, startTime, endTime });
  const icsData  = buildICS({ title: calTitle, description: calDesc, slotDate: date, startTime, endTime, uid: `booking-${bookingId}@uask.live`, url: 'https://uask.live/dashboard/student' });

  await send({
    to: studentEmail,
    subject: `Your session with ${providerName} is confirmed ✓`,
    html: shell(`Your session with ${providerName} on ${date} is confirmed`, `
      ${header('✅', "You're confirmed!", `${providerName} accepted your booking.`)}
      ${body(`
        ${infoTable(
          infoRow('Provider', providerName),
          infoRow('Date & time', date, `${startTime} – ${endTime}`)
        )}
        <p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.6">
          Add it to your calendar so you don't miss it:
        </p>
        <div>
          ${btn(gCalUrl, '📅 Google Calendar', '#4285F4')}
          ${btn(`https://uask.live/api/bookings/${bookingId}/ics?token=${icsToken}`, '🍎 Apple / Outlook', '#1C1C1E')}
        </div>
        ${divider()}
        ${note('The .ics attachment also works with Outlook or any other calendar app.')}
      `)}
    `),
    attachments: [{ filename: 'session.ics', content: icsData, contentType: 'text/calendar; charset=UTF-8; method=REQUEST' }],
  });
}

export async function sendCancellationNotification({ toEmail, toName, otherName, date, startTime, endTime, role }) {
  const isProvider = role === 'provider';
  await send({
    to: toEmail,
    subject: `Session with ${otherName} on ${date} was cancelled`,
    html: shell(`Session cancellation — ${date}`, `
      ${header('❌', 'Session cancelled', isProvider
        ? `${otherName} has cancelled their booking with you.`
        : `${otherName} has cancelled your upcoming session.`)}
      ${body(`
        ${infoTable(
          infoRow(isProvider ? 'Student' : 'Provider', otherName),
          infoRow('Date & time', date, `${startTime} – ${endTime}`)
        )}
        <p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.6">
          ${isProvider
            ? 'The time slot has been freed up on your dashboard.'
            : 'Your booking has been removed from your dashboard.'}
        </p>
        ${btn(isProvider ? 'https://uask.live/dashboard/provider' : 'https://uask.live/dashboard/student', 'Open dashboard')}
      `)}
    `),
  });
}

export async function sendProviderConfirmationCopy({ providerEmail, providerName, studentName, studentEmail, date, startTime, endTime, bookingId, icsToken = '' }) {
  const calTitle = `Session with ${studentName}`;
  const calDesc  = `Student: ${studentName} (${studentEmail}) · Manage at uask.live/dashboard/provider`;
  const gCalUrl  = googleCalendarUrl({ title: calTitle, description: calDesc, slotDate: date, startTime, endTime });
  const icsData  = buildICS({ title: calTitle, description: calDesc, slotDate: date, startTime, endTime, uid: `booking-${bookingId}-provider@uask.live`, url: 'https://uask.live/dashboard/provider' });

  await send({
    to: providerEmail,
    subject: `Session confirmed with ${studentName} — ${date}`,
    html: shell(`Confirmed: session with ${studentName} on ${date}`, `
      ${header('🗓️', 'Session confirmed', `You're all set with ${studentName}.`)}
      ${body(`
        ${infoTable(
          infoRow('Student', studentName, studentEmail),
          infoRow('Date & time', date, `${startTime} – ${endTime}`)
        )}
        <p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.6">
          Add it to your calendar:
        </p>
        <div>
          ${btn(gCalUrl, '📅 Google Calendar', '#4285F4')}
          ${btn(`https://uask.live/api/bookings/${bookingId}/ics?for=provider&token=${icsToken}`, '🍎 Apple / Outlook', '#1C1C1E')}
        </div>
        ${divider()}
        ${btn('https://uask.live/dashboard/provider', 'Open dashboard')}
        ${note('The .ics attachment also works with Outlook or any other calendar app.')}
      `)}
    `),
    attachments: [{ filename: 'session.ics', content: icsData, contentType: 'text/calendar; charset=UTF-8; method=REQUEST' }],
  });
}

export async function sendConnectionRequestEmail({ toEmail, toName, fromName }) {
  await send({
    to: toEmail,
    subject: `${fromName} wants to connect with you on ASK`,
    html: shell(`${fromName} sent you a connection request`, `
      ${header('🤝', `${fromName} wants to connect`, 'You have a new connection request on ASK Marketplace.')}
      ${body(`
        <p style="margin:0 0 20px;font-size:14px;color:${MUTED};line-height:1.6">
          ${fromName} sent you a connection request. Accept it to stay in touch and see each other's activity.
        </p>
        ${btn('https://uask.live/people/connections', 'View request')}
      `)}
    `),
  });
}

export async function sendConnectionAcceptedEmail({ toEmail, toName, fromName }) {
  await send({
    to: toEmail,
    subject: `${fromName} accepted your connection request`,
    html: shell(`${fromName} is now connected with you`, `
      ${header('✅', `You're connected with ${fromName}!`, `${fromName} accepted your connection request.`)}
      ${body(`
        <p style="margin:0 0 20px;font-size:14px;color:${MUTED};line-height:1.6">
          You can now message ${fromName} directly on ASK.
        </p>
        ${btn('https://uask.live/people', 'Browse people')}
      `)}
    `),
  });
}

export async function sendAdminNewUserNotification({ name, email, method = 'email' }) {
  await send({
    to: adminRecipientsFor(name, email),
    subject: `New signup: ${name}`,
    html: shell(`New user joined ASK`, `
      ${header('🎉', 'New signup!', 'Someone just created an account on ASK Marketplace.')}
      ${body(`
        ${infoTable(
          infoRow('Name', name),
          infoRow('Email', email),
          infoRow('Method', method),
          infoRow('Time', new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })),
        )}
        ${btn('https://uask.live/admin', 'View admin panel')}
      `)}
    `),
  });
}

export async function sendNoAvailabilityReminderEmail({ toEmail, toName, listingTitle, profileUrl }) {
  const first = (toName || 'there').split(' ')[0];
  await send({
    to: toEmail,
    subject: 'Add times so students can book you on ASK',
    html: shell(`Your ASK listing needs availability`, `
      ${header('⏰', `Add bookable times, ${first}`, 'Your listing is live, but students need open slots before they can book.')}
      ${body(`
        <p style="margin:0 0 16px;font-size:15px;color:${DARK};line-height:1.6">
          Your ${listingTitle ? `<strong>${listingTitle}</strong>` : 'ASK'} listing does not have any available time slots yet.
          Add a few regular times so students can book without texting back and forth.
        </p>
        <p style="margin:0 0 20px;font-size:14px;color:${MUTED};line-height:1.6">
          Quick win: add weeknight or Sunday slots for the next 4 weeks. You can remove or change them anytime.
        </p>
        ${btn('https://uask.live/dashboard/provider?tab=availability', 'Add availability')}
        ${profileUrl ? btn(profileUrl, 'View my profile', '#111111') : ''}
      `)}
    `),
  });
}

export async function sendAdminPrankNotification() {
  await send({
    to: [DEV_ADMIN_EMAIL],
    subject: 'Admin test: Maya Mandelbaum definitely did not just sign up',
    html: shell('Admin test notification', `
      ${header('🧪', 'Admin test/prank', 'This is a labeled test email from ASK. No real user signed up.')}
      ${body(`
        <p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.6">
          Maya Mandelbaum did <strong>not</strong> just create an account. This is Nachum testing whether admin notifications still have a pulse.
        </p>
        <p style="margin:0 0 20px;font-size:14px;color:${MUTED};line-height:1.6">
          If this made you open the admin panel, the system is working emotionally and technically.
        </p>
        ${btn('https://uask.live/admin', 'Open admin panel')}
      `)}
    `),
  });
}
