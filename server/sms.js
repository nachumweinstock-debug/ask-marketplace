/**
 * SMS notifications via Twilio REST API.
 * No SDK needed — plain fetch to the REST API.
 * Silently no-ops if TWILIO_* env vars aren't set or user has no phone.
 */

const BASE = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;

async function sendSms(to, body) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) return;
  if (!to) return;

  // Normalize: strip non-digits, add +1 if looks like a 10-digit US number
  const digits = to.replace(/\D/g, '');
  const e164 = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits[0] === '1' ? `+${digits}` : to;

  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      },
      body: new URLSearchParams({ From: TWILIO_FROM, To: e164, Body: body }),
    });
    const data = await res.json();
    if (data.error_code) {
      console.error(`[SMS] ❌ ${e164}: ${data.message}`);
    } else {
      console.log(`[SMS] ✅ ${e164} | sid=${data.sid}`);
    }
  } catch (err) {
    console.error(`[SMS] ❌ fetch error: ${err.message}`);
  }
}

// ── Notification helpers ───────────────────────────────────────────────────────

export async function smsBookingRequest({ phone, studentName, date, startTime }) {
  await sendSms(phone,
    `ASK: New booking from ${studentName} on ${date} at ${startTime}. Accept at uask.live/dashboard/provider`
  );
}

export async function smsBookingConfirmed({ phone, providerName, date, startTime }) {
  await sendSms(phone,
    `ASK: Your session with ${providerName} on ${date} at ${startTime} is confirmed! uask.live`
  );
}

export async function smsNewDm({ phone, senderName }) {
  await sendSms(phone,
    `ASK: ${senderName} sent you a message. Reply at uask.live/messages`
  );
}

export async function smsBookingReminder({ phone, studentName }) {
  await sendSms(phone,
    `ASK: Reminder — you have a pending booking from ${studentName} waiting for your response. uask.live/dashboard/provider`
  );
}

export async function smsDmReminder({ phone, senderName }) {
  await sendSms(phone,
    `ASK: You still have an unread message from ${senderName}. uask.live/messages`
  );
}
