import { useState } from 'react';
import { DAYS, TIMES, fmtTime, fmtDay, autoEndTime, sortSlots } from '../lib/slots';

const inputStyle = {
  width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 13.5, outline: 'none',
  background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)',
  transition: 'border-color .15s', boxSizing: 'border-box', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
};

const selectWrap = { position: 'relative' };
const chevron = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  pointerEvents: 'none', color: 'var(--muted)', fontSize: 11,
};

function TimeSelect({ value, onChange, minTime, label, placeholder }) {
  const opts = minTime ? TIMES.filter(t => t > minTime) : TIMES;
  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>}
      <div style={selectWrap}>
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, paddingRight: 32, color: value ? 'var(--text)' : 'var(--muted)' }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        >
          <option value="">{placeholder || 'Select…'}</option>
          {opts.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
        </select>
        <span style={chevron}>▾</span>
      </div>
    </div>
  );
}

// onAdd(slots: [{date, start_time, end_time}])
export default function SlotPicker({ onAdd, existingSlots = [], addLabel = '+ Add slots' }) {
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  function toggleDay(day) {
    setSelectedDays(d => d.includes(day) ? d.filter(x => x !== day) : [...d, day]);
    setError('');
  }

  function handleStart(t) {
    setStartTime(t);
    setEndTime(autoEndTime(t));
    setError('');
  }

  function handleEnd(t) {
    setEndTime(t);
    setError('');
  }

  function handleAdd() {
    if (selectedDays.length === 0) { setError('Pick at least one day.'); return; }
    if (!startTime) { setError('Choose a start time.'); return; }
    if (!endTime) { setError('Choose an end time.'); return; }
    if (endTime <= startTime) { setError('"To" must be after "From".'); return; }

    // Deduplicate against existing slots
    const existingKeys = new Set(existingSlots.map(s => `${s.date}|${s.start_time}|${s.end_time}`));
    const newSlots = selectedDays
      .filter(day => !existingKeys.has(`${day}|${startTime}|${endTime}`))
      .map(day => ({ date: day, start_time: startTime, end_time: endTime }));

    if (newSlots.length === 0) { setError('Those slots already exist.'); return; }

    onAdd(newSlots);
    setSelectedDays([]);
    setError('');
    // Keep times — natural to add more slots at the same time on different days
  }

  const ready = selectedDays.length > 0 && startTime && endTime && endTime > startTime;

  return (
    <div>
      {/* Day multi-select */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 8 }}>
          Day — tap to toggle, pick multiple
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DAYS.map(day => {
            const active = selectedDays.includes(day);
            return (
              <button key={day} type="button" onClick={() => toggleDay(day)}
                style={{
                  padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                  border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  background: active ? 'var(--primary)' : 'var(--card)',
                  color: active ? '#fff' : 'var(--muted)',
                  cursor: 'pointer', transition: 'all .12s',
                  fontFamily: 'var(--font-ui)',
                  boxShadow: active ? '0 2px 8px rgba(59,130,246,0.25)' : 'none',
                }}>
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <TimeSelect value={startTime} onChange={handleStart} label="From" placeholder="Start time" />
        <TimeSelect value={endTime} onChange={handleEnd} minTime={startTime} label="To" placeholder="End time" />
      </div>

      {/* Smart hint */}
      {startTime && endTime && endTime > startTime && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          {selectedDays.length > 0
            ? `Adding ${selectedDays.length} slot${selectedDays.length > 1 ? 's' : ''}: ${selectedDays.map(d => d.slice(0,3)).join(', ')} · ${fmtTime(startTime)} – ${fmtTime(endTime)}`
            : `${fmtTime(startTime)} – ${fmtTime(endTime)} · pick day(s) above`}
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{error}</div>}

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

// Slot list display — shared between CreateListing (local state) and ProviderDashboard (DB)
export function SlotList({ slots, onRemove, emptyText = 'No slots yet.' }) {
  if (slots.length === 0) return (
    <div style={{
      textAlign: 'center', padding: '18px 14px', fontSize: 13, color: 'var(--muted)',
      border: '1.5px dashed var(--border)', borderRadius: 8, marginTop: 16,
    }}>
      {emptyText}
    </div>
  );

  const sorted = sortSlots(slots);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
      {sorted.map((slot, i) => (
        <div key={slot.id || i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'var(--bg)',
          border: '1px solid var(--border)', borderRadius: 8,
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
          </div>
          {onRemove && !slot.is_booked && (
            <button type="button" onClick={() => onRemove(slot.id || i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#DC2626', fontFamily: 'var(--font-ui)', padding: '2px 6px' }}>
              Remove
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
