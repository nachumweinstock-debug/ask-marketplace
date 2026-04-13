import nodemailer from 'nodemailer';

function getTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT || '587'),
    secure: parseInt(EMAIL_PORT || '587') === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

function codeBlock(code) {
  return `<div style="font-size:40px;font-weight:700;letter-spacing:10px;text-align:center;color:#1e293b;background:#fff;border:2px solid #fde68a;border-radius:12px;padding:20px 0;margin:24px 0">${code}</div>`;
}

export async function sendVerificationCode(toEmail, code) {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback — print to console
    console.log(`\n📧 VERIFICATION CODE for ${toEmail}: ${code}\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Your ASK verification code',
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;background:#fdf9f2;border-radius:16px">
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px">Verify your YU email</h2>
      <p style="margin:0;color:#64748b;font-size:15px">Enter this code to complete your sign-up.</p>
      ${codeBlock(code)}
      <p style="margin:0;color:#94a3b8;font-size:13px">Expires in 10 minutes. Didn't request this? Ignore it.</p>
    </div>`,
  });
}

export async function sendBookingNotification({ providerEmail, providerName, studentName, studentEmail, date, startTime, endTime }) {
  const transporter = getTransporter();
  const timeStr = `${startTime}–${endTime}`;

  if (!transporter) {
    console.log(`\n📅 NEW BOOKING for ${providerEmail}: ${studentName} (${studentEmail}) booked ${date} ${timeStr}\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: providerEmail,
    subject: `🎉 New booking from ${studentName}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:32px 24px;background:#fdf9f2;border-radius:16px">
      <h2 style="margin:0 0 6px;color:#1e293b;font-size:22px">You got a booking, mazel tov!</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">Someone just booked a session with you on ASK.</p>
      <div style="background:#fff;border:1px solid #e5e0d8;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <div style="margin-bottom:12px">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#9ca3af">Student</span>
          <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-top:2px">${studentName}</div>
          <div style="font-size:13px;color:#6b7280">${studentEmail}</div>
        </div>
        <div>
          <span style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#9ca3af">Session</span>
          <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-top:2px">${date}</div>
          <div style="font-size:13px;color:#6b7280">${timeStr}</div>
        </div>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:13px">Log in to <a href="https://uask.live" style="color:#3b82f6">uask.live</a> to confirm or message the student.</p>
    </div>`,
  });
}

export async function sendBookingConfirmation({ studentEmail, studentName, providerName, date, startTime, endTime }) {
  const transporter = getTransporter();
  const timeStr = `${startTime}–${endTime}`;

  if (!transporter) {
    console.log(`\n✅ BOOKING CONFIRMED for ${studentEmail}: session with ${providerName} on ${date} ${timeStr}\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: studentEmail,
    subject: `✅ Your session with ${providerName} is confirmed`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:32px 24px;background:#fdf9f2;border-radius:16px">
      <h2 style="margin:0 0 6px;color:#1e293b;font-size:22px">You're all set!</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">${providerName} confirmed your session.</p>
      <div style="background:#fff;border:1px solid #e5e0d8;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <div style="margin-bottom:12px">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#9ca3af">Provider</span>
          <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-top:2px">${providerName}</div>
        </div>
        <div>
          <span style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#9ca3af">Session</span>
          <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-top:2px">${date}</div>
          <div style="font-size:13px;color:#6b7280">${timeStr}</div>
        </div>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:13px">View your booking at <a href="https://uask.live/dashboard/student" style="color:#3b82f6">uask.live</a></p>
    </div>`,
  });
}

export async function sendProviderConfirmationCopy({ providerEmail, providerName, studentName, studentEmail, date, startTime, endTime }) {
  const transporter = getTransporter();
  const timeStr = `${startTime}–${endTime}`;

  if (!transporter) {
    console.log(`\n📋 CONFIRMATION COPY for provider ${providerEmail}: session with ${studentName} on ${date} ${timeStr}\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: providerEmail,
    subject: `📋 Session confirmed with ${studentName} — ${date} ${timeStr}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:32px 24px;background:#fdf9f2;border-radius:16px">
      <h2 style="margin:0 0 6px;color:#1e293b;font-size:22px">Session confirmed!</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px">Here's a reminder of your upcoming session.</p>
      <div style="background:#fff;border:1px solid #e5e0d8;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <div style="margin-bottom:12px">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#9ca3af">Student</span>
          <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-top:2px">${studentName}</div>
          <div style="font-size:13px;color:#6b7280">${studentEmail}</div>
        </div>
        <div>
          <span style="font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#9ca3af">Session</span>
          <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-top:2px">${date}</div>
          <div style="font-size:13px;color:#6b7280">${timeStr}</div>
        </div>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:13px">Manage your bookings at <a href="https://uask.live/dashboard/provider" style="color:#3b82f6">uask.live</a></p>
    </div>`,
  });
}

export async function sendPasswordResetCode(toEmail, code) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`\n🔑 PASSWORD RESET CODE for ${toEmail}: ${code}\n`);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Reset your ASK password',
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;background:#fdf9f2;border-radius:16px">
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px">Reset your password</h2>
      <p style="margin:0;color:#64748b;font-size:15px">Enter this code to set a new password.</p>
      ${codeBlock(code)}
      <p style="margin:0;color:#94a3b8;font-size:13px">Expires in 10 minutes. Didn't request this? Ignore it.</p>
    </div>`,
  });
}
