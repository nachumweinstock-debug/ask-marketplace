/**
 * Calendar helpers — ICS generation + Google Calendar URL builder.
 * Works with both ISO dates (YYYY-MM-DD) and day-of-week names ("Monday").
 * When given a day name, we compute the next upcoming occurrence.
 */

const DAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

/** Returns a Date object for the event date. */
function resolveDate(slotDate) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
    // Already a real date — parse as local midnight
    const [y, m, d] = slotDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // Day-of-week name → find next upcoming occurrence (including today)
  const target = DAY_INDEX[slotDate];
  if (target === undefined) return new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  let diff = target - todayDay;
  if (diff < 0) diff += 7;   // already passed this week → next week
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return result;
}

/** Formats a Date + HH:MM time string into an ICS datetime string (YYYYMMDDTHHMMSS). */
function icsDateTime(date, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${mo}${d}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
}

/**
 * Builds an .ics file string for a booking.
 * @param {{ title, description, slotDate, startTime, endTime, url, uid }} opts
 */
export function buildICS({ title, description, slotDate, startTime, endTime, url, uid }) {
  const date = resolveDate(slotDate);
  const dtStart = icsDateTime(date, startTime);
  const dtEnd   = icsDateTime(date, endTime);
  const dtstamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const safeDesc = (description || '').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ASK Marketplace//uask.live//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid || `booking-${Date.now()}@uask.live`}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${safeDesc}`,
    `URL:${url || 'https://uask.live'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Returns a Google Calendar "Add event" URL.
 */
export function googleCalendarUrl({ title, description, slotDate, startTime, endTime }) {
  const date = resolveDate(slotDate);
  const dtStart = icsDateTime(date, startTime);
  const dtEnd   = icsDateTime(date, endTime);
  const params = new URLSearchParams({
    action:  'TEMPLATE',
    text:    title,
    dates:   `${dtStart}/${dtEnd}`,
    details: description || '',
    sprop:   'website:uask.live',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
