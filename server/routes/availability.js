import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const DAY_ORDER = `CASE date
  WHEN 'Monday'    THEN 1
  WHEN 'Tuesday'   THEN 2
  WHEN 'Wednesday' THEN 3
  WHEN 'Thursday'  THEN 4
  WHEN 'Friday'    THEN 5
  WHEN 'Saturday'  THEN 6
  WHEN 'Sunday'    THEN 7
  ELSE 8 END`;

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function sanitizeAiSlots(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map(slot => ({
      date: String(slot?.date || '').trim(),
      start_time: String(slot?.start_time || '').trim(),
      end_time: String(slot?.end_time || '').trim(),
    }))
    .filter(slot => /^\d{4}-\d{2}-\d{2}$/.test(slot.date) && /^\d{2}:\d{2}$/.test(slot.start_time) && /^\d{2}:\d{2}$/.test(slot.end_time) && slot.end_time > slot.start_time)
    .filter(slot => {
      const key = `${slot.date}|${slot.start_time}|${slot.end_time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
}

function easternToday() {
  const text = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  return new Date(`${text}T00:00:00`);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeTimeToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '');
}

function parseClock(raw, fallbackSuffix = '') {
  const token = normalizeTimeToken(raw);
  const match = token.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || '0');
  const suffix = match[3] || fallbackSuffix;
  if (minute > 59 || hour < 1 || hour > 12 || !suffix) return null;
  if (hour === 12) hour = 0;
  if (suffix === 'pm') hour += 12;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseTimeRange(text) {
  const lower = String(text || '').toLowerCase();
  const match = lower.match(/from\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
    || lower.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (!match) return null;
  const startToken = normalizeTimeToken(match[1]);
  const endToken = normalizeTimeToken(match[2]);
  const suffix = (endToken.match(/(am|pm)$/)?.[1]) || (startToken.match(/(am|pm)$/)?.[1]) || '';
  const start = parseClock(startToken, suffix);
  const end = parseClock(endToken, suffix);
  if (!start || !end || end <= start) return null;
  return { start_time: start, end_time: end };
}

function parseWeekdays(text) {
  const found = WEEKDAYS
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => new RegExp(`\\b${day.toLowerCase()}s?\\b`, 'i').test(text));
  if (!found.length) return [];
  return found.map(item => item.index);
}

function parseUntilDate(text, baseDate) {
  const match = String(text || '').match(/until\s+([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
  if (!match) return null;
  const monthName = match[1];
  const day = Number(match[2]);
  const year = baseDate.getFullYear();
  const parsed = new Date(`${monthName} ${day}, ${year} 00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed < baseDate) {
    parsed.setFullYear(parsed.getFullYear() + 1);
  }
  return parsed;
}

function parseWeeksWindow(text, baseDate) {
  const match = String(text || '').match(/for\s+the\s+next\s+(\d+)\s+weeks?/i);
  if (!match) return null;
  const weeks = Number(match[1]);
  if (!weeks || weeks < 1 || weeks > 52) return null;
  const end = new Date(baseDate);
  end.setDate(end.getDate() + (weeks * 7) - 1);
  return end;
}

function generateRecurringSlots(text) {
  const baseDate = easternToday();
  const weekdays = parseWeekdays(text);
  const times = parseTimeRange(text);
  const endDate = parseUntilDate(text, baseDate) || parseWeeksWindow(text, baseDate);
  if (!weekdays.length || !times || !endDate) return [];

  const slots = [];
  const cursor = new Date(baseDate);
  while (cursor <= endDate) {
    if (weekdays.includes(cursor.getDay())) {
      slots.push({
        date: toIsoDate(cursor),
        start_time: times.start_time,
        end_time: times.end_time,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sanitizeAiSlots(slots);
}

function parseScheduleFallback(text) {
  const slots = generateRecurringSlots(text);
  if (!slots.length) {
    throw new Error('Could not parse this schedule. Try weekday-based patterns like "Tuesday and Thursday 6-7pm for the next 3 weeks".');
  }
  return slots;
}

router.post('/parse-schedule', requireAuth, async (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ error: 'Providers only' });

  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text required' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    try {
      return res.json({ slots: parseScheduleFallback(text), source: 'fallback' });
    } catch (err) {
      return res.status(503).json({ error: err.message || 'Schedule AI is not configured' });
    }
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a scheduling parser. The user will describe a recurring schedule in plain English. Return ONLY a valid JSON array, no explanation, no markdown. Each object must have: date (YYYY-MM-DD), start_time (HH:MM 24hr), end_time (HH:MM 24hr). Generate all individual dates, not recurring rules. Assume today's date is ${today} in America/New_York.\n\nUser request: ${text}`,
          }],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', description: 'YYYY-MM-DD date' },
                start_time: { type: 'string', description: 'HH:MM 24hr start time' },
                end_time: { type: 'string', description: 'HH:MM 24hr end time' },
              },
              required: ['date', 'start_time', 'end_time'],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({ error: `Schedule AI request failed: ${detail.slice(0, 200)}` });
    }

    const payload = await response.json();
    const rawContent = payload?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('') || '';
    const trimmed = String(rawContent).trim();
    const normalized = trimmed.startsWith('```')
      ? trimmed.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
      : trimmed;
    const jsonSlice = normalized.includes('[')
      ? normalized.slice(normalized.indexOf('['), normalized.lastIndexOf(']') + 1)
      : normalized;
    const slots = sanitizeAiSlots(JSON.parse(jsonSlice));
    return res.json({ slots });
  } catch (err) {
    try {
      return res.json({ slots: parseScheduleFallback(text), source: 'fallback' });
    } catch {
      return res.status(502).json({ error: err.message || 'Schedule AI parse failed' });
    }
  }
});

router.get('/:providerId', (req, res) => {
  // Exclude slots where the provider is already booked on *any* of their listings at the same time.
  // This prevents double-booking across multiple services offered by the same person.
  const slots = db.prepare(`
    SELECT a.*
    FROM availability a
    JOIN provider_profiles pp ON a.provider_id = pp.id
    WHERE a.provider_id = ?
      AND a.is_booked = 0
      AND (a.date NOT GLOB '[0-9]*' OR a.date >= date('now'))
      AND NOT EXISTS (
        SELECT 1
        FROM availability a2
        JOIN provider_profiles pp2 ON a2.provider_id = pp2.id
        JOIN bookings b ON b.availability_id = a2.id
        WHERE pp2.user_id = pp.user_id
          AND a2.date = a.date
          AND a2.start_time < a.end_time
          AND a2.end_time > a.start_time
          AND b.status NOT IN ('cancelled')
      )
    ORDER BY a.date, a.start_time
  `).all(req.params.providerId);
  res.json(slots);
});

router.post('/', requireAuth, (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ error: 'Providers only' });

  const { date, start_time, end_time, provider_id } = req.body;

  // If provider_id supplied, verify ownership; otherwise fall back to most recent profile
  let profile;
  if (provider_id) {
    profile = db.prepare('SELECT id FROM provider_profiles WHERE id = ? AND user_id = ?').get(provider_id, req.user.id);
    if (!profile) return res.status(404).json({ error: 'Listing not found' });
  } else {
    profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
    if (!profile) return res.status(404).json({ error: 'No profile found' });
  }

  if (!date || !start_time || !end_time) return res.status(400).json({ error: 'date, start_time, end_time required' });
  const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const isRealDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date + 'T00:00:00').getTime());
  if (!DAY_NAMES.includes(date) && !isRealDate) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD or a day name' });
  }
  if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) return res.status(400).json({ error: 'times must be HH:MM format' });
  if (start_time >= end_time) return res.status(400).json({ error: 'end_time must be after start_time' });

  const result = db.prepare(
    'INSERT INTO availability (provider_id, date, start_time, end_time) VALUES (?, ?, ?, ?)'
  ).run(profile.id, date, start_time, end_time);

  res.json(db.prepare('SELECT * FROM availability WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'provider') return res.status(403).json({ error: 'Providers only' });
  // Check ownership across all of the user's listings
  const slot = db.prepare(`
    SELECT a.* FROM availability a
    JOIN provider_profiles pp ON a.provider_id = pp.id
    WHERE a.id = ? AND pp.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  if (slot.is_booked) return res.status(400).json({ error: 'Cannot delete booked slot' });
  db.prepare('DELETE FROM availability WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
