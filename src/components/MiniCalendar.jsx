import { useState } from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// markedDates  — Set<string> YYYY-MM-DD: dates that have availability (show dot + highlight)
// selectedDates — Set<string> YYYY-MM-DD: dates currently selected by user
// onSelect(dateStr) — called on any non-disabled date click
// onlyMarked — if true, only marked dates are clickable (student booking view)
// disablePast  — gray out & block past dates (default true)
export default function MiniCalendar({
  markedDates = new Set(),
  selectedDates = new Set(),
  onSelect,
  onlyMarked = false,
  disablePast = true,
}) {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear]   = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const firstDow     = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel   = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button type="button" onClick={prevMonth} style={NAV}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{monthLabel}</span>
        <button type="button" onClick={nextMonth} style={NAV}>›</button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--muted)', padding: '2px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`_${i}`} />;

          const dateStr  = toStr(viewYear, viewMonth, day);
          const dateObj  = new Date(viewYear, viewMonth, day);
          const isPast   = disablePast && dateObj < todayDate;
          const isMarked = markedDates.has(dateStr);
          const isSel    = selectedDates.has(dateStr);
          const isToday  = dateObj.getTime() === todayDate.getTime();
          const disabled = isPast || (onlyMarked && !isMarked);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => !disabled && onSelect?.(dateStr)}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1',
                padding: 0,
                borderRadius: 7,
                border: isToday && !isSel ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                fontSize: 13,
                fontWeight: isSel || isMarked ? 600 : 400,
                cursor: disabled ? 'default' : 'pointer',
                background: isSel ? 'var(--primary)' : isMarked ? '#EFF6FF' : 'transparent',
                color: isSel ? '#fff' : isPast ? '#CBD5E1' : isMarked ? 'var(--primary)' : 'var(--text)',
                opacity: disabled && !isPast ? 0.35 : 1,
                transition: 'background .1s',
                fontFamily: 'var(--font-ui)',
              }}
              onMouseEnter={e => {
                if (!disabled && !isSel) e.currentTarget.style.background = '#EFF6FF';
              }}
              onMouseLeave={e => {
                if (!isSel) e.currentTarget.style.background = isMarked ? '#EFF6FF' : 'transparent';
              }}
            >
              {day}
              {/* Dot for marked (available) dates */}
              {isMarked && !isSel && (
                <span style={{
                  position: 'absolute', bottom: 3, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--primary)', display: 'block',
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const NAV = {
  border: 'none', background: 'none', cursor: 'pointer',
  fontSize: 20, lineHeight: 1, color: 'var(--muted)',
  padding: '2px 8px', borderRadius: 6, fontFamily: 'var(--font-ui)',
};
