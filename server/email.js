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
