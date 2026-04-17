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
      return;
    } catch (smtpErr) {
      console.warn('[EMAIL] SMTP failed, falling back to Resend:', smtpErr.message);
    }
  }

  // Resend second (requires verified domain to send to anyone other than Resend account owner)
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
    if (result.error) throw new Error(result.error.message || 'Resend error');
    return;
  }

  // Dev fallback — code is visible in Railway logs
  console.log(`\n📧 [EMAIL DEV - NOT SENT] To: ${to}\nSubject: ${subject}\nHTML snippet: ${html.slice(0, 200)}\n`);
}

// ── Design system ──────────────────────────────────────────────────────────────
const BLUE   = '#1B4FD8';
const DARK   = '#111111';
const MUTED  = '#6B7280';
const BORDER = '#E5E7EB';
const BG     = '#F9FAFB';

function shell(preheader, body) {
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
  <!-- preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${BG};padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%">

        <!-- Logo header -->
        <tr><td style="padding-bottom:24px;text-align:center">
          <a href="https://uask.live" style="text-decoration:none">
            <span style="font-size:22px;font-weight:800;letter-spacing:2px;color:${DARK};font-family:Georgia,serif">ASK</span>
          </a>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 8px;text-align:center">
          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6">
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
  <div style="background:${BLUE};padding:32px 40px 28px">
    ${emoji ? `<div style="font-size:32px;margin-bottom:12px;line-height:1">${emoji}</div>` : ''}
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3">${title}</h1>
    ${subtitle ? `<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.5">${subtitle}</p>` : ''}
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
  <div style="background:${BG};border:1.5px solid ${BORDER};border-radius:10px;padding:28px 20px;margin:24px 0;text-align:center">
    <div style="font-size:48px;font-weight:800;letter-spacing:14px;color:${DARK};font-family:'Courier New',Courier,monospace;line-height:1">${code}</div>
    <div style="font-size:12px;color:${MUTED};margin-top:10px">This code expires in 10 minutes</div>
  </div>`;
}

function infoRow(label, val, sub = '') {
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${BORDER}">
      <div style="font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:${MUTED};margin-bottom:3px">${label}</div>
      <div style="font-size:15px;font-weight:600;color:${DARK}">${val}</div>
      ${sub ? `<div style="font-size:13px;color:${MUTED};margin-top:1px">${sub}</div>` : ''}
    </td>
  </tr>`;
}

function infoTable(...rows) {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${BG};border:1px solid ${BORDER};border-radius:10px;padding:4px 20px;margin:20px 0">
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function btn(href, label, color = BLUE) {
  return `
  <a href="${href}" target="_blank"
    style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;
    padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;
    letter-spacing:0.1px;margin-top:4px;margin-right:8px;margin-bottom:8px">
    ${label}
  </a>`;
}

function note(text) {
  return `<p style="margin:16px 0 0;font-size:12px;color:${MUTED};line-height:1.6">${text}</p>`;
}

// ── Email functions ────────────────────────────────────────────────────────────

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

export async function sendBookingConfirmation({ studentEmail, studentName, providerName, date, startTime, endTime, bookingId }) {
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
          ${btn(`https://uask.live/api/bookings/${bookingId}/ics`, '🍎 Apple Calendar', '#1C1C1E')}
        </div>
        ${divider()}
        ${note('The .ics file attached to this email also works with Outlook or any other calendar app.')}
      `)}
    `),
    attachments: [{ filename: 'session.ics', content: icsData, contentType: 'text/calendar; charset=UTF-8; method=REQUEST' }],
  });
}

export async function sendProviderConfirmationCopy({ providerEmail, providerName, studentName, studentEmail, date, startTime, endTime, bookingId }) {
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
          ${btn(`https://uask.live/api/bookings/${bookingId}/ics`, '🍎 Apple Calendar', '#1C1C1E')}
        </div>
        ${divider()}
        ${btn('https://uask.live/dashboard/provider', 'Open dashboard', BLUE)}
        ${note('The .ics file attached works with Outlook and any other calendar app.')}
      `)}
    `),
    attachments: [{ filename: 'session.ics', content: icsData, contentType: 'text/calendar; charset=UTF-8; method=REQUEST' }],
  });
}
