export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// "14:30" → "2:30 PM"
export function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// "Thursday" → "Thursday"  |  "2024-01-18" → "Thu, Jan 18"
export function fmtDay(date) {
  if (!date) return '';
  if (DAYS.includes(date)) return date;
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch {
    return date;
  }
}
