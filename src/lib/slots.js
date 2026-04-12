export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// 15-minute increments 6:00 AM – 11:45 PM
export const TIMES = [];
for (let h = 6; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIMES.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

// "14:30" → "2:30 PM"
export function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Given a start time "HH:MM", return end time +1 hour (snapped to 15-min grid, capped at last slot)
export function autoEndTime(start) {
  if (!start) return '';
  const [h, m] = start.split(':').map(Number);
  const totalMins = h * 60 + m + 60;
  if (totalMins >= 24 * 60) return TIMES[TIMES.length - 1];
  const endH = Math.floor(totalMins / 60);
  const endM = totalMins % 60;
  const t = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  return TIMES.includes(t) ? t : (TIMES.find(x => x > start) || '');
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

// Sort slots by Mon→Sun then start_time
export function sortSlots(slots) {
  return [...slots].sort((a, b) => {
    const di = DAYS.indexOf(a.date) - DAYS.indexOf(b.date);
    if (di !== 0) return di;
    return a.start_time.localeCompare(b.start_time);
  });
}
