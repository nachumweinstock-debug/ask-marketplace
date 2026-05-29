import { useState } from 'react';
import { TIMES, fmtTime, fmtDay, autoEndTime, sortSlots } from '../lib/slots';
import MiniCalendar from './MiniCalendar';

// ── Natural-language schedule parser ─────────────────────────────────────────
const DAY_MAP = {
  sunday:0, sun:0, sundays:0,
  monday:1, mon:1, mondays:1,
  tuesday:2, tue:2, tues:2, tuesdays:2,
  wednesday:3, wed:3, wednesdays:3,
  thursday:4, thu:4, thur:4, thurs:4, thursdays:4,
  friday:5, fri:5, fridays:5,
  saturday:6, sat:6, saturdays:6,
};
const WEEKDAYS = [1,2,3,4,5];
const WEEKNIGHTS = [1,2,3,4];
const WEEKENDS = [0,6];

const MONTH_IDX = { jan:0,january:0, feb:1,february:1, mar:2,march:2, apr:3,april:3, may:4,
  jun:5,june:5, jul:6,july:6, aug:7,august:7, sep:8,september:8, oct:9,october:9,
  nov:10,november:10, dec:11,december:11 };

function parseHHMM(str, ampm) {
  const [hStr, mStr = '00'] = str.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr.padStart(2, '0');
  if (ampm === 'pm' && h !== 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

function parseScheduleText(text) {
  const lower = text.toLowerCase();

  // Days
  let days = [];
  if (/\bweekdays\b/.test(lower)) days.push(...WEEKDAYS);
  if (/\bweeknights?\b/.test(lower)) days.push(...WEEKNIGHTS);
  if (/\bweekends?\b/.test(lower)) days.push(...WEEKENDS);
  for (const [word, idx] of Object.entries(DAY_MAP)) {
    if (new RegExp(`\\b${word}\\b`).test(lower) && !days.includes(idx)) days.push(idx);
  }
  days = [...new Set(days)].sort();

  // Time range — e.g. "8-10pm", "8pm-10pm", "8:30 to 10pm", "9am-11am"
  let startTime = null, endTime = null;
  const timeRx = /(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*(?:[-–to]+)\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)/i;
  const m = lower.match(timeRx);
  if (m) {
    const [, s, sAP, e, eAP] = m;
    endTime = parseHHMM(e, eAP.toLowerCase());
    const sH = parseInt(s);
    const eH = parseInt(e);
    // if start lacks am/pm, inherit end or guess
    const sAmpm = sAP ? sAP.toLowerCase() : (eAP.toLowerCase() === 'pm' && sH <= eH ? 'pm' : (sH < 12 ? 'pm' : 'am'));
    startTime = parseHHMM(s, sAmpm);
  }

  // Weeks/until
  let weeks = 4;
  const forWeeks = lower.match(/for\s+(?:the\s+next\s+)?(\d+)\s+weeks?/);
  if (forWeeks) weeks = parseInt(forWeeks[1]);
  const forMonths = lower.match(/for\s+(?:the\s+next\s+)?(\d+)\s+months?/);
  if (forMonths) weeks = parseInt(forMonths[1]) * 4;

  // "until October" / "until October 15" / "through November"
  const untilRx = /(?:until|through|thru|till)\s+(?:the\s+end\s+of\s+)?([a-z]+)(?:\s+(\d+))?/i;
  const um = lower.match(untilRx);
  if (um) {
    const mIdx = MONTH_IDX[um[1].toLowerCase()];
    if (mIdx !== undefined) {
      const dayNum = um[2] ? parseInt(um[2]) : null;
      const now = new Date();
      let yr = now.getFullYear();
      const lastOfMonth = new Date(yr, mIdx + 1, 0);
      if (lastOfMonth < now) yr++;
      const endDate = dayNum ? new Date(yr, mIdx, dayNum) : new Date(yr, mIdx + 1, 0);
      weeks = Math.max(1, Math.ceil((endDate - now) / (7 * 24 * 60 * 60 * 1000)) + 1);
    }
  }

  return { days, startTime, endTime, weeks };
}

function describeResult({ days, startTime, endTime, weeks }) {
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (!days.length || !startTime || !endTime) return null;
  const dStr = days.map(d => dayNames[d]).join(', ');
  return `Every ${dStr} · ${fmtTime(startTime)}–${fmtTime(endTime)} · ${weeks} weeks`;
}

const inputStyle = {
  width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 13.5, outline: 'none',
  background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)',
  transition: 'border-color .15s', boxSizing: 'border-box', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
};

function TimeSelect({ value, onChange, minTime, label, placeholder }) {
  const opts = minTime ? TIMES.filter(t => t > minTime) : TIMES;
  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>}
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, paddingRight: 32, color: value ? 'var(--text)' : 'var(--muted)' }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        >
          <option value="">{placeholder || 'Select…'}</option>
          {opts.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)', fontSize: 11 }}>▾</span>
      </div>
    </div>
  );
}

// onAdd(slots: [{date: 'YYYY-MM-DD', start_time, end_time}])
export default function SlotPicker({ onAdd, existingSlots = [], addLabel = '+ Add slots' }) {
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quickDays, setQuickDays] = useState(new Set());
  const [quickStart, setQuickStart] = useState('20:00');
  const [quickEnd, setQuickEnd] = useState('21:00');
  const [quickWeeks, setQuickWeeks] = useState(4);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [aiText, setAiText] = useState('');
  const [aiPreview, setAiPreview] = useState(null);
  const [aiError, setAiError] = useState('');

  // Dates that already have real-date slots (show as marked in calendar)
  const existingDateSlots = existingSlots.filter(s => /^\d{4}/.test(s.date));
  const markedDates = new Set(existingDateSlots.map(s => s.date));

  function toggleDate(dateStr) {
    setSelectedDates(prev => {
      const next = new Set(prev);
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
      return next;
    });
    setError('');
    setNotice('');
  }

  function handleStart(t) {
    setStartTime(t);
    setEndTime(autoEndTime(t));
    setError('');
    setNotice('');
  }

  function handleAdd() {
    if (selectedDates.size === 0) { setNotice(''); setError('Pick at least one date on the calendar.'); return; }
    if (!startTime)               { setNotice(''); setError('Choose a start time.'); return; }
    if (!endTime)                 { setNotice(''); setError('Choose an end time.'); return; }
    if (endTime <= startTime)     { setNotice(''); setError('"To" must be after "From".'); return; }

    const newSlots = uniqueSlots([...selectedDates].sort().map(date => ({ date, start_time: startTime, end_time: endTime })));
    if (newSlots.length === 0) { setNotice(''); setError('Those slots already exist.'); return; }

    onAdd(newSlots);
    setSelectedDates(new Set());
    setError('');
    setNotice(`Added ${newSlots.length} slot${newSlots.length === 1 ? '' : 's'}.`);
  }

  function uniqueSlots(candidates) {
    const existingKeys = new Set(existingSlots.map(s => `${s.date}|${s.start_time}|${s.end_time}`));
    const seen = new Set();
    return candidates
      .filter(slot => {
        const key = `${slot.date}|${slot.start_time}|${slot.end_time}`;
        if (existingKeys.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  }

  function toISODate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function datesForWeekdays(dayIndexes, weeks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysAhead = Math.max(7, Number(weeks) * 7);
    const dates = [];
    for (let offset = 0; offset < daysAhead; offset += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      if (dayIndexes.includes(d.getDay())) dates.push(toISODate(d));
    }
    return dates;
  }

  function addCandidates(candidates, successMessage) {
    const newSlots = uniqueSlots(candidates);
    if (newSlots.length === 0) { setNotice(''); setError('Those slots already exist.'); return; }

    onAdd(newSlots);
    setError('');
    setNotice(successMessage || `Added ${newSlots.length} slot${newSlots.length === 1 ? '' : 's'}.`);
  }

  function addPreset(days, from, to, label, weeks = 4) {
    addCandidates(
      datesForWeekdays(days, weeks).map(date => ({ date, start_time: from, end_time: to })),
      `${label}: added slots for the next ${weeks} weeks.`
    );
  }

  function addRecurring() {
    if (quickDays.size === 0) { setNotice(''); setError('Choose at least one weekday.'); return; }
    if (!quickStart || !quickEnd || quickEnd <= quickStart) { setNotice(''); setError('Choose a valid time range.'); return; }
    addCandidates(
      datesForWeekdays([...quickDays], quickWeeks).map(date => ({ date, start_time: quickStart, end_time: quickEnd })),
      `Added your regular availability for the next ${quickWeeks} weeks.`
    );
  }

  function toggleQuickDay(day) {
    setQuickDays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
    setError('');
    setNotice('');
  }

  function handleAiChange(val) {
    setAiText(val);
    setAiError('');
    if (!val.trim()) { setAiPreview(null); return; }
    const parsed = parseScheduleText(val);
    const desc = describeResult(parsed);
    setAiPreview(desc ? { parsed, desc } : null);
  }

  function handleAiAdd() {
    if (!aiPreview) { setAiError('Try something like "every Sunday 8-10pm until October"'); return; }
    const { days, startTime: s, endTime: e, weeks } = aiPreview.parsed;
    addCandidates(
      datesForWeekdays(days, weeks).map(date => ({ date, start_time: s, end_time: e })),
      `Added from AI schedule: ${aiPreview.desc}`
    );
    setAiText('');
    setAiPreview(null);
    setAiError('');
  }

  const ready = selectedDates.size > 0 && startTime && endTime && endTime > startTime;

  return (
    <div>
      {/* ── AI scheduling ── */}
      <div style={{
        border: '1.5px solid #E0D9F5', borderRadius: 14, padding: 16,
        background: 'linear-gradient(135deg,#F5F3FF,#EDE9FE)', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>✨</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#5B21B6' }}>AI Scheduling</span>
          <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 500 }}>— type it, we'll build the slots</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={aiText}
            onChange={e => handleAiChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAiAdd()}
            placeholder='e.g. "every Sunday 8-10pm until October"'
            style={{
              flex: 1, border: '1.5px solid #C4B5FD', borderRadius: 10,
              padding: '10px 14px', fontSize: 13, outline: 'none',
              background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)',
            }}
            onFocus={e => e.target.style.borderColor = '#7C3AED'}
            onBlur={e => e.target.style.borderColor = '#C4B5FD'}
          />
          <button
            type="button"
            onClick={handleAiAdd}
            disabled={!aiPreview}
            style={{
              border: 'none', borderRadius: 10, padding: '10px 18px',
              background: aiPreview ? '#7C3AED' : '#DDD6FE',
              color: aiPreview ? '#fff' : '#A78BFA',
              fontSize: 13, fontWeight: 800, cursor: aiPreview ? 'pointer' : 'default',
              fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Add slots
          </button>
        </div>
        {aiPreview && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#5B21B6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>✓</span> {aiPreview.desc}
          </div>
        )}
        {aiError && <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626' }}>{aiError}</div>}
        <div style={{ marginTop: 8, fontSize: 11, color: '#7C3AED', opacity: 0.7 }}>
          Try: "Sundays and Tuesdays 9-11pm for 8 weeks" · "weeknights 8-9pm until December" · "every Friday 2-4pm until November 15"
        </div>
      </div>

      <div style={{
        border: '1px solid var(--border)', borderRadius: 14, padding: 16,
        background: 'linear-gradient(180deg,#fff,var(--cream-50))', marginBottom: 18,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>Quick add regular times</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>Pick the days you usually teach. We will create bookable slots for the next few weeks.</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
          {[
            { label: 'Weeknights 8-9 PM', days: [1, 2, 3, 4], from: '20:00', to: '21:00' },
            { label: 'Sunday 10-11 AM', days: [0], from: '10:00', to: '11:00' },
            { label: 'Weekdays 12-1 PM', days: [1, 2, 3, 4, 5], from: '12:00', to: '13:00' },
          ].map(preset => (
            <button key={preset.label} type="button"
              onClick={() => addPreset(preset.days, preset.from, preset.to, preset.label)}
              style={{
                border: '1px solid var(--border)', background: '#fff', color: 'var(--text)',
                borderRadius: 999, padding: '7px 11px', fontSize: 12, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}>
              {preset.label}
            </button>
          ))}
        </div>

        <div className="slot-quick-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 120px 120px 96px', gap: 10, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>Days</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
              {[
                ['S', 0], ['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6],
              ].map(([label, day]) => {
                const active = quickDays.has(day);
                return (
                  <button key={`${label}-${day}`} type="button" onClick={() => toggleQuickDay(day)}
                    style={{
                      height: 34, borderRadius: 9,
                      border: `1.5px solid ${active ? 'var(--ink-900)' : 'var(--border)'}`,
                      background: active ? 'var(--ink-900)' : '#fff',
                      color: active ? '#fff' : 'var(--text)',
                      cursor: 'pointer', fontWeight: 900, fontFamily: 'var(--font-ui)',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <TimeSelect value={quickStart} onChange={t => { setQuickStart(t); setQuickEnd(autoEndTime(t)); setError(''); setNotice(''); }} label="From" />
          <TimeSelect value={quickEnd} onChange={t => { setQuickEnd(t); setError(''); setNotice(''); }} minTime={quickStart} label="To" />
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>Weeks</div>
            <select value={quickWeeks} onChange={e => setQuickWeeks(Number(e.target.value))} style={inputStyle}>
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </div>
        </div>

        <button type="button" onClick={addRecurring}
          style={{
            marginTop: 12, width: '100%', border: 'none', borderRadius: 999,
            background: 'var(--ink-900)', color: '#fff', padding: '11px 14px',
            fontSize: 13.5, fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-ui)',
          }}>
          Add regular availability
        </button>
      </div>

      {/* Calendar date picker */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 10 }}>
          Tap dates to add availability — select multiple at once
        </div>
        <MiniCalendar
          markedDates={markedDates}
          selectedDates={selectedDates}
          onSelect={toggleDate}
          disablePast={true}
          onlyMarked={false}
        />
        {selectedDates.size > 0 && (
          <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 8, fontWeight: 500 }}>
            {selectedDates.size} date{selectedDates.size > 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Time row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <TimeSelect value={startTime} onChange={handleStart} label="From" placeholder="Start time" />
        <TimeSelect value={endTime} onChange={v => setEndTime(v)} minTime={startTime} label="To" placeholder="End time" />
      </div>

      {startTime && endTime && endTime > startTime && selectedDates.size > 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          Adding {selectedDates.size} slot{selectedDates.size > 1 ? 's' : ''} · {fmtTime(startTime)} – {fmtTime(endTime)}
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{error}</div>}
      {notice && <div style={{ fontSize: 12, color: '#166534', marginBottom: 10, fontWeight: 700 }}>{notice}</div>}

      <button type="button" onClick={handleAdd}
        style={{
          background: ready ? 'var(--primary)' : '#93C5FD',
          color: '#fff', border: 'none', borderRadius: 999,
          padding: '11px 24px', fontSize: 13.5, fontWeight: 600,
          cursor: ready ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--font-ui)', transition: 'background .15s',
        }}>
        {addLabel}
      </button>
    </div>
  );
}

const TODAY = new Date().toISOString().split('T')[0];
function isRealDate(d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }
function isPast(d)     { return isRealDate(d) && d < TODAY; }

// Slot list — shared between CreateListing and ProviderDashboard
export function SlotList({ slots, onRemove, emptyText = 'No slots yet.' }) {
  const [showPast, setShowPast] = useState(false);

  if (slots.length === 0) return (
    <div style={{
      textAlign: 'center', padding: '18px 14px', fontSize: 13, color: 'var(--muted)',
      border: '1.5px dashed var(--border)', borderRadius: 8, marginTop: 16,
    }}>
      {emptyText}
    </div>
  );

  const sorted = sortSlots(slots);
  const upcoming = sorted.filter(s => !isPast(s.date));
  const past     = sorted.filter(s => isPast(s.date));

  function SlotRow({ slot, i, dim }) {
    return (
      <div key={slot.id ?? i} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: 8,
        opacity: dim ? 0.55 : 1,
      }}>
        <div style={{ fontSize: 13.5, color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
          <strong style={{ fontWeight: 600 }}>{fmtDay(slot.date)}</strong>
          <span style={{ color: 'var(--muted)', margin: '0 8px' }}>·</span>
          {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
          {slot.is_booked && (
            <span style={{ marginLeft: 10, fontSize: 11, background: '#FFF8E6', color: '#92600A', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
              Booked
            </span>
          )}
          {dim && (
            <span style={{ marginLeft: 10, fontSize: 10, background: 'var(--gray-100)', color: 'var(--muted)', padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>
              EXPIRED
            </span>
          )}
        </div>
        {onRemove && !slot.is_booked && (
          <button type="button" onClick={() => onRemove(slot.id ?? i)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#DC2626', fontFamily: 'var(--font-ui)', padding: '2px 6px' }}>
            Remove
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      {upcoming.length === 0 && past.length === 0 && (
        <div style={{ textAlign: 'center', padding: '18px 14px', fontSize: 13, color: 'var(--muted)', border: '1.5px dashed var(--border)', borderRadius: 8 }}>
          {emptyText}
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {upcoming.map((slot, i) => <SlotRow key={slot.id ?? i} slot={slot} i={i} dim={false} />)}
        </div>
      )}

      {past.length > 0 && (
        <div style={{ marginTop: upcoming.length > 0 ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button type="button" onClick={() => setShowPast(p => !p)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em',
              textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-ui)',
            }}>
              {showPast ? '▾' : '▸'} {past.length} expired slot{past.length !== 1 ? 's' : ''}
            </button>
            {onRemove && showPast && (
              <button type="button"
                onClick={() => { if (confirm('Remove all expired slots?')) past.filter(s => !s.is_booked).forEach(s => onRemove(s.id)); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#DC2626', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
                Clear all
              </button>
            )}
          </div>
          {showPast && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {past.map((slot, i) => <SlotRow key={slot.id ?? i} slot={slot} i={i} dim={true} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
