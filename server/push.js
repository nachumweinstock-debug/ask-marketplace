import apn from '@parse/node-apn';
import db from './db.js';

let _provider = null;

function provider() {
  if (_provider) return _provider;
  const { APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID } = process.env;
  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) return null;
  _provider = new apn.Provider({
    token: {
      key: APNS_KEY.replace(/\\n/g, '\n'),
      keyId: APNS_KEY_ID,
      teamId: APNS_TEAM_ID,
    },
    production: process.env.NODE_ENV === 'production',
  });
  return _provider;
}

// Push a notification to every device registered to userId
export async function pushToUser(userId, { title, body, data = {}, badge = 1 }) {
  const p = provider();
  if (!p) return; // APNs not configured yet — silently skip

  const tokens = db.prepare('SELECT token FROM device_tokens WHERE user_id = ?').all(userId);
  if (!tokens.length) return;

  const note = new apn.Notification();
  note.alert = { title, body };
  note.topic = 'live.uask.app';
  note.payload = data;
  note.sound = 'default';
  note.badge = badge;

  await Promise.allSettled(tokens.map(({ token }) => p.send(note, token)));
}

const ADMIN_EMAILS = ['nachumweinstock@gmail.com', 'jfeit3@mail.yu.edu'];

// Push a notification to all admin accounts
export async function pushToAdmins(title, body, data = {}) {
  const placeholders = ADMIN_EMAILS.map(() => '?').join(',');
  const admins = db.prepare(`SELECT id FROM users WHERE email IN (${placeholders})`).all(...ADMIN_EMAILS);
  await Promise.allSettled(admins.map(u => pushToUser(u.id, { title, body, data })));
}

// Convenience wrappers matching the email function names

export async function pushBookingRequest(providerUserId, { studentName, date, startTime }) {
  return pushToUser(providerUserId, {
    title: 'New booking request',
    body: `${studentName} wants to book you on ${date} at ${startTime}`,
    data: { screen: 'provider_dashboard' },
  });
}

export async function pushBookingConfirmed(studentUserId, { providerName, date, startTime }) {
  return pushToUser(studentUserId, {
    title: 'Booking confirmed!',
    body: `${providerName} confirmed your session on ${date} at ${startTime}`,
    data: { screen: 'student_dashboard' },
  });
}

export async function pushBookingDeclined(studentUserId, { providerName }) {
  return pushToUser(studentUserId, {
    title: 'Booking declined',
    body: `${providerName} couldn't accept this booking. Find another time or provider.`,
    data: { screen: 'browse' },
  });
}

export async function pushBookingCancelled(userId, { otherName, date }) {
  return pushToUser(userId, {
    title: 'Session cancelled',
    body: `Your session with ${otherName} on ${date} was cancelled`,
    data: { screen: 'student_dashboard' },
  });
}

export async function pushNewMessage(recipientUserId, { senderName, preview, bookingId }) {
  return pushToUser(recipientUserId, {
    title: `Message from ${senderName}`,
    body: preview.length > 80 ? preview.slice(0, 77) + '…' : preview,
    data: { screen: 'chat', bookingId },
  });
}

export async function pushNewReview(providerUserId, { studentName, rating }) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  return pushToUser(providerUserId, {
    title: `New ${rating}-star review`,
    body: `${studentName} left you a review ${stars}`,
    data: { screen: 'provider_dashboard' },
  });
}

export async function pushRescheduleProposal(recipientUserId, { fromName, newDate, newStart }) {
  return pushToUser(recipientUserId, {
    title: 'Reschedule request',
    body: `${fromName} wants to move your session to ${newDate} at ${newStart}`,
    data: { screen: 'student_dashboard' },
  });
}

export async function pushRescheduleResponse(recipientUserId, { fromName, accepted, newDate }) {
  return pushToUser(recipientUserId, {
    title: accepted ? 'Reschedule accepted' : 'Reschedule declined',
    body: accepted
      ? `${fromName} confirmed the new time — ${newDate}`
      : `${fromName} declined the reschedule request`,
    data: { screen: 'provider_dashboard' },
  });
}

export async function pushAppointmentReminder(userId, { otherName, date, startTime }) {
  return pushToUser(userId, {
    title: 'Session tomorrow',
    body: `Don't forget — you have a session with ${otherName} on ${date} at ${startTime}`,
    data: { screen: 'student_dashboard' },
  });
}

export async function pushConnectionRequest(toUserId, { fromName }) {
  return pushToUser(toUserId, {
    title: 'New connection request',
    body: `${fromName} wants to connect with you`,
    data: { screen: 'people' },
  });
}

export async function pushConnectionAccepted(toUserId, { fromName }) {
  return pushToUser(toUserId, {
    title: 'Connection accepted',
    body: `${fromName} accepted your connection request`,
    data: { screen: 'people' },
  });
}
