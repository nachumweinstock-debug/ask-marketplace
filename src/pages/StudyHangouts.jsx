import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#1B3A6B';
const CREAM = '#FAF7F2';

const YU_LOCATIONS = [
  { id: 'furst',   name: 'Furst Hall',   short: 'Furst',   floors: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor'] },
  { id: 'library', name: 'Wilf Library', short: 'Library', floors: ['1st Floor', '2nd Floor', '3rd Floor — Quiet', '4th Floor', '5th Floor'] },
  { id: 'glueck',  name: 'Glueck',       short: 'Glueck',  floors: ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor'] },
  { id: 'morg',    name: 'Morg',         short: 'Morg',    floors: ['GF', '1F', '2F', '3F', '4F', '5F', '6F', '7F', '8F', '9F', '10F', '11F', '12F'] },
  { id: 'belfer',  name: 'Belfer Hall',  short: 'Belfer',  floors: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor'] },
  { id: 'zysman',  name: 'Zysman Hall',  short: 'Zysman',  floors: ['1st Floor', '2nd Floor', '3rd Floor'] },
  { id: 'rubin',   name: 'Rubin Hall',   short: 'Rubin',   floors: ['Lobby', '1st Floor', '2nd Floor', '3rd Floor'] },
  { id: 'other',   name: 'Other',        short: 'Other…',  floors: [] },
];

function LocationPicker({ value, onChange }) {
  const [building, setBuilding] = useState(null);
  const [floor, setFloor] = useState('');
  const [customText, setCustomText] = useState('');

  function pickBuilding(b) {
    setBuilding(b);
    setFloor('');
    setCustomText('');
    onChange('');
  }

  function pickFloor(f) {
    setFloor(f);
    onChange(`${building.name} — ${f}`);
  }

  function clear() {
    setBuilding(null);
    setFloor('');
    setCustomText('');
    onChange('');
  }

  const isOther = building?.id === 'other';

  return (
    <div>
      {/* Confirmed location badge */}
      {value && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#EEF3FF', border: '1.5px solid #BFDBFE',
          borderRadius: 9, padding: '9px 13px', marginBottom: 10,
        }}>
          <span style={{ fontSize: 13, color: NAVY, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            📍 {value}
          </span>
          <button type="button" onClick={clear} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#8D8577', fontSize: 13, lineHeight: 1, padding: '0 0 0 10px',
          }}>✕</button>
        </div>
      )}

      {/* Building grid — 4 per row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {YU_LOCATIONS.map(b => {
          const active = building?.id === b.id;
          return (
            <button
              type="button"
              key={b.id}
              onClick={() => pickBuilding(b)}
              style={{
                padding: '9px 4px', borderRadius: 8, textAlign: 'center',
                border: `1.5px solid ${active ? NAVY : '#D9D2C3'}`,
                background: active ? NAVY : '#fff',
                color: active ? '#fff' : '#342F29',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.background = '#F0F4FF'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#D9D2C3'; e.currentTarget.style.background = '#fff'; } }}
            >
              {b.short}
            </button>
          );
        })}
      </div>

      {/* Floor chips — revealed after building is picked */}
      {building && !isOther && building.floors.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: '#8D8577',
            fontFamily: 'var(--font-ui)', marginBottom: 7,
          }}>
            {building.name} — select floor
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {building.floors.map(f => {
              const active = floor === f;
              return (
                <button
                  type="button"
                  key={f}
                  onClick={() => pickFloor(f)}
                  style={{
                    padding: '6px 13px', borderRadius: 7,
                    border: `1.5px solid ${active ? NAVY : '#D9D2C3'}`,
                    background: active ? '#EEF3FF' : '#fff',
                    color: active ? NAVY : '#6D665C',
                    fontSize: 12.5, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#D9D2C3'; e.currentTarget.style.color = '#6D665C'; } }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Free-text for "Other" */}
      {isOther && (
        <input
          autoFocus
          style={{
            marginTop: 10, width: '100%', padding: '11px 13px', borderRadius: 8,
            border: '1.5px solid #D9D2C3', fontSize: 14, boxSizing: 'border-box',
            fontFamily: "'Outfit', sans-serif", color: '#17130F',
            background: '#fff', outline: 'none', transition: 'border-color 0.15s',
          }}
          placeholder="Describe the location…"
          value={customText}
          onChange={e => { setCustomText(e.target.value); onChange(e.target.value); }}
          onFocus={e => { e.currentTarget.style.borderColor = NAVY; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#D9D2C3'; }}
          maxLength={80}
        />
      )}
    </div>
  );
}

const SUBJECT_CATEGORIES = [
  {
    id: 'business',
    label: 'Business',
    subjects: [
      // Accounting
      'Accounting I', 'Accounting II', 'Intermediate Accounting I', 'Intermediate Accounting II',
      'Cost Accounting', 'Auditing', 'Tax Accounting', 'Advanced Accounting',
      // Finance
      'Corporate Finance', 'Investments', 'Financial Modeling', 'Financial Statement Analysis',
      'Portfolio Management', 'Derivatives', 'Real Estate Finance', 'International Finance',
      // Quant / Math for Business
      'Statistics for Business', 'Business Math', 'Regression Analysis', 'Econometrics',
      'Operations Research', 'Quantitative Methods', 'Data Analytics',
      // Other Business
      'Economics', 'Microeconomics', 'Macroeconomics', 'Marketing', 'Management',
      'Organizational Behavior', 'Business Law', 'Supply Chain', 'Excel / Spreadsheets',
    ],
  },
  {
    id: 'stem',
    label: 'STEM',
    subjects: [
      // Math
      'Calculus I', 'Calculus II', 'Calculus III', 'Multivariable Calculus',
      'Linear Algebra', 'Differential Equations', 'Discrete Math', 'Real Analysis', 'Abstract Algebra',
      'Statistics', 'Probability',
      // Sciences
      'Biology', 'Chemistry', 'Organic Chemistry I', 'Organic Chemistry II',
      'Biochemistry', 'Physics I', 'Physics II', 'Anatomy & Physiology',
      'Genetics', 'Cell Biology', 'Microbiology',
      // CS / Engineering
      'Computer Science', 'Data Structures', 'Algorithms', 'Programming', 'Python', 'Java',
      'Data Science', 'Machine Learning', 'Engineering',
    ],
  },
  {
    id: 'humanities',
    label: 'Humanities',
    subjects: [
      'English Writing', 'Essay Writing', 'Research Paper', 'Psychology', 'Abnormal Psychology',
      'History', 'American History', 'World History', 'Political Science', 'Sociology',
      'Philosophy', 'Ethics', 'Literature', 'Communications', 'Speech',
      'Anthropology', 'Religious Studies',
    ],
  },
  {
    id: 'torah',
    label: 'Torah',
    subjects: [
      'Gemara', 'Halacha', 'Tanach', 'Chumash', 'Machshava', 'Mussar',
      'Mishna', 'Rishonim', 'Acharonim', 'Tefilla', 'Jewish History',
    ],
  },
  {
    id: 'languages',
    label: 'Languages',
    subjects: ['Hebrew', 'Spanish', 'French', 'Yiddish', 'Arabic', 'Greek', 'Latin'],
  },
];

function SubjectPicker({ value, onChange }) {
  const [tab, setTab] = useState('stem');
  const [query, setQuery] = useState('');

  const currentSubjects = SUBJECT_CATEGORIES.find(c => c.id === tab)?.subjects || [];
  const filtered = query.trim()
    ? SUBJECT_CATEGORIES.flatMap(c => c.subjects).filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : currentSubjects;

  function pick(s) {
    onChange(s);
    setQuery('');
  }

  return (
    <div>
      <input
        style={{
          width: '100%', padding: '11px 13px', borderRadius: 8, boxSizing: 'border-box',
          border: `1.5px solid ${value ? NAVY : '#D9D2C3'}`, fontSize: 14,
          fontFamily: "'Outfit', sans-serif", color: '#17130F',
          background: '#fff', outline: 'none', transition: 'border-color 0.15s',
          marginBottom: 10,
        }}
        placeholder="Type to search or pick below…"
        value={query || value}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
        onFocus={e => { e.currentTarget.style.borderColor = NAVY; if (value) setQuery(value); }}
        onBlur={e => { e.currentTarget.style.borderColor = value ? NAVY : '#D9D2C3'; setQuery(''); }}
        maxLength={80}
        autoFocus
      />
      {!query && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          {SUBJECT_CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setTab(c.id)}
              style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${tab === c.id ? NAVY : '#D9D2C3'}`,
                background: tab === c.id ? NAVY : '#fff',
                color: tab === c.id ? '#fff' : '#6D665C',
                cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.1s',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {filtered.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => pick(s)}
            style={{
              padding: '6px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500,
              border: `1.5px solid ${value === s ? NAVY : '#D9D2C3'}`,
              background: value === s ? '#EEF3FF' : '#fff',
              color: value === s ? NAVY : '#6D665C',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              transition: 'all 0.1s',
            }}
            onMouseEnter={e => { if (value !== s) { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY; } }}
            onMouseLeave={e => { if (value !== s) { e.currentTarget.style.borderColor = '#D9D2C3'; e.currentTarget.style.color = '#6D665C'; } }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ src, name, size = 30 }) {
  if (src) {
    return (
      <img src={src} alt={name} style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: NAVY, color: '#fff', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, fontFamily: 'var(--font-ui)',
    }}>
      {initials(name)}
    </div>
  );
}

function SessionChat({ sessionId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const load = useCallback(() => {
    api.get(`/hangouts/${sessionId}/messages`)
      .then(({ data }) => setMessages(data))
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`/hangouts/${sessionId}/messages`, { body: draft.trim() });
      setMessages(m => [...m, data]);
      setDraft('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  function fmt(ts) {
    const d = new Date(ts + (ts.endsWith('Z') ? '' : 'Z'));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{
      borderTop: '1px solid #E8E3DA', marginTop: 6, paddingTop: 12,
    }}>
      <div style={{
        maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10,
        marginBottom: 10, paddingRight: 2,
      }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 12.5, color: '#8D8577', fontFamily: "'Outfit', sans-serif", textAlign: 'center', margin: '8px 0' }}>
            No messages yet — say hi!
          </p>
        )}
        {messages.map(m => {
          const isMe = m.user_id === currentUser?.id;
          return (
            <div key={m.id} style={{
              display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
              alignItems: 'flex-end', gap: 7,
            }}>
              {!isMe && <Avatar src={m.avatar_url} name={m.name} size={24} />}
              <div style={{ maxWidth: '75%' }}>
                {!isMe && (
                  <div style={{ fontSize: 10.5, color: '#8D8577', fontFamily: "'Outfit', sans-serif", marginBottom: 2, paddingLeft: 3 }}>
                    {m.name}
                  </div>
                )}
                <div style={{
                  padding: '8px 11px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: isMe ? NAVY : '#F0F4F8',
                  color: isMe ? '#fff' : '#17130F',
                  fontSize: 13.5, fontFamily: "'Outfit', sans-serif", lineHeight: 1.45,
                  wordBreak: 'break-word',
                }}>
                  {m.body}
                </div>
                <div style={{ fontSize: 10, color: '#B0A898', fontFamily: 'var(--font-ui)', marginTop: 2, textAlign: isMe ? 'right' : 'left', paddingLeft: isMe ? 0 : 3 }}>
                  {fmt(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} style={{ display: 'flex', gap: 7 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Message the group…"
          maxLength={500}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 20,
            border: '1.5px solid #D9D2C3', fontSize: 13.5,
            fontFamily: "'Outfit', sans-serif", outline: 'none',
            background: '#fff', color: '#17130F',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = NAVY; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#D9D2C3'; }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          style={{
            padding: '9px 16px', borderRadius: 20, border: 'none',
            background: draft.trim() ? NAVY : '#E8E3DA',
            color: draft.trim() ? '#fff' : '#B0A898',
            fontSize: 13, fontWeight: 600, cursor: draft.trim() ? 'pointer' : 'default',
            fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s', flexShrink: 0,
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
      {error && <p style={{ fontSize: 12, color: '#DC2626', margin: '4px 0 0', fontFamily: 'var(--font-ui)' }}>{error}</p>}
    </div>
  );
}

function SessionCard({ session, onJoin, joining, onCancel, currentUser }) {
  const expired = new Date(session.expires_at) <= Date.now();
  if (expired) return null;

  const isJoined = !!session.joined;
  const isHost = currentUser?.id === session.user_id;
  const [chatOpen, setChatOpen] = useState(false);
  const [attendees, setAttendees] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isJoined) return;
    api.get(`/hangouts/${session.id}/attendees`)
      .then(({ data }) => setAttendees(data))
      .catch(() => {});
  }, [session.id, isJoined, session.attendee_count]);

  function copyInvite() {
    navigator.clipboard.writeText(`${window.location.origin}/hangouts`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleCancel() {
    if (!window.confirm('End your session? Everyone will be removed.')) return;
    setCancelling(true);
    try {
      await api.delete(`/hangouts/${session.id}`);
      onCancel(session.id);
    } catch {
      setCancelling(false);
    }
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: '20px 22px',
      border: `1px solid ${isHost ? 'rgba(27,58,107,0.25)' : '#E8E3DA'}`,
      boxShadow: isHost ? '0 2px 12px rgba(27,58,107,0.10)' : '0 2px 12px rgba(27,58,107,0.06)',
      display: 'flex', flexDirection: 'column', gap: 14,
      transition: 'box-shadow 0.18s, transform 0.18s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(27,58,107,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = isHost ? '0 2px 12px rgba(27,58,107,0.10)' : '0 2px 12px rgba(27,58,107,0.06)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Subject + time remaining */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          {isHost && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: NAVY, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 4 }}>
              Your session
            </span>
          )}
          <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: NAVY, fontWeight: 400, margin: 0, lineHeight: 1.2 }}>
            {session.subject}
          </h3>
          {session.class_code && (
            <span style={{ display: 'inline-block', marginTop: 5, background: '#EEF3FF', color: '#2558D8', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', padding: '2px 9px', borderRadius: 99, fontFamily: 'var(--font-ui)' }}>
              {session.class_code.toUpperCase()}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11.5, color: '#8D8577', fontFamily: 'var(--font-ui)', fontWeight: 500, flexShrink: 0, marginTop: 3, whiteSpace: 'nowrap' }}>
          {timeLeft(session.expires_at)}
        </span>
      </div>

      {/* Location */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6D665C', fontSize: 13.5, fontFamily: "'Outfit', sans-serif" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        {session.location}
      </div>

      {/* Attendees row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {attendees ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {attendees.slice(0, 6).map((a, i) => (
                <div key={a.id} title={a.name} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 6 - i, borderRadius: '50%', border: '2px solid #fff' }}>
                  <Avatar src={a.avatar_url} name={a.name} size={26} />
                </div>
              ))}
              {attendees.length > 6 && (
                <span style={{ marginLeft: 4, fontSize: 11.5, color: '#8D8577', fontFamily: 'var(--font-ui)' }}>+{attendees.length - 6}</span>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar src={session.host_avatar} name={session.host_name} size={26} />
              <span style={{ fontSize: 13, color: '#342F29', fontFamily: "'Outfit', sans-serif" }}>{session.host_name}</span>
            </div>
          )}
        </div>
        <span style={{ fontSize: 13, color: NAVY, fontWeight: 600, fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {session.attendee_count}
        </span>
      </div>

      {/* Actions */}
      {isJoined ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, background: '#EDF7F0', color: '#0F7B55', fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            You're in
          </div>
          <button onClick={() => setChatOpen(o => !o)} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: chatOpen ? NAVY : '#EEF3FF', color: chatOpen ? '#fff' : NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chat
          </button>
          <button onClick={copyInvite} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: copied ? '#EDF7F0' : '#F5F3EF', color: copied ? '#0F7B55' : '#6D665C', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {copied ? <polyline points="20 6 9 17 4 12"/> : <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>}
            </svg>
            {copied ? 'Copied!' : 'Invite'}
          </button>
          {isHost && (
            <button onClick={handleCancel} disabled={cancelling} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #FCA5A5', background: '#FFF5F5', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: cancelling ? 'default' : 'pointer', fontFamily: "'Outfit', sans-serif", opacity: cancelling ? 0.6 : 1, transition: 'all 0.15s' }}>
              {cancelling ? 'Ending…' : 'End'}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => onJoin(session.id)}
          disabled={joining === session.id}
          style={{ width: '100%', padding: '10px', borderRadius: 10, background: NAVY, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: joining === session.id ? 'default' : 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'background 0.15s', opacity: joining === session.id ? 0.7 : 1 }}
          onMouseEnter={e => { if (joining !== session.id) e.currentTarget.style.background = '#142D54'; }}
          onMouseLeave={e => { e.currentTarget.style.background = NAVY; }}
        >
          {joining === session.id ? 'Joining…' : 'Join'}
        </button>
      )}

      {isJoined && chatOpen && (
        <SessionChat sessionId={session.id} currentUser={currentUser} />
      )}
    </div>
  );
}

function StartSessionModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ subject: '', location: '', class_code: '', duration_hours: '2' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.location.trim()) {
      setError('Subject and location are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/hangouts', form);
      onCreate(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create session. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  const inputStyle = {
    width: '100%', padding: '11px 13px', borderRadius: 8,
    border: '1.5px solid #D9D2C3', fontSize: 14,
    fontFamily: "'Outfit', sans-serif", color: '#17130F',
    background: '#fff', outline: 'none',
    transition: 'border-color 0.15s',
  };
  const labelStyle = {
    display: 'block', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.03em',
    color: NAVY, marginBottom: 6, fontFamily: "'Outfit', sans-serif",
    textTransform: 'uppercase',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(27,58,107,0.2)',
        backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: CREAM, borderRadius: 20, padding: '32px 30px',
        maxWidth: 480, width: '100%',
        boxShadow: '0 24px 64px rgba(27,58,107,0.20)',
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        <h2 style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 28, color: NAVY, marginBottom: 6, fontWeight: 400,
        }}>
          Start a Session
        </h2>
        <p style={{ fontSize: 14, color: '#6D665C', fontFamily: "'Outfit', sans-serif", marginBottom: 24 }}>
          Let your classmates know where you're studying.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Subject *</label>
            <SubjectPicker
              value={form.subject}
              onChange={v => setForm(f => ({ ...f, subject: v }))}
            />
          </div>

          <div>
            <label style={labelStyle}>Location *</label>
            <LocationPicker
              value={form.location}
              onChange={loc => setForm(f => ({ ...f, location: loc }))}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Class Code{' '}
              <span style={{ fontWeight: 400, color: '#8D8577', textTransform: 'none' }}>(optional)</span>
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. FIN-3160, CHEM-4480"
              value={form.class_code}
              onChange={set('class_code')}
              onFocus={e => { e.currentTarget.style.borderColor = NAVY; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#D9D2C3'; }}
              maxLength={20}
            />
          </div>

          <div>
            <label style={labelStyle}>Duration</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['1', '2', '3'].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, duration_hours: h }))}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    border: `1.5px solid ${form.duration_hours === h ? NAVY : '#D9D2C3'}`,
                    background: form.duration_hours === h ? NAVY : '#fff',
                    color: form.duration_hours === h ? '#fff' : '#342F29',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                    transition: 'all 0.12s',
                  }}
                >
                  {h}hr
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ color: '#DC2626', fontSize: 13, fontFamily: 'var(--font-ui)', margin: 0 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', borderRadius: 10,
                background: '#fff', color: '#342F29',
                border: '1.5px solid #D9D2C3', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: '12px', borderRadius: 10,
                background: NAVY, color: '#fff', border: 'none',
                fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                fontFamily: "'Outfit', sans-serif",
                opacity: loading ? 0.72 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#142D54'; }}
              onMouseLeave={e => { e.currentTarget.style.background = NAVY; }}
            >
              {loading ? 'Starting…' : 'Start Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudyHangouts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(!!location.state?.openModal);
  const [joining, setJoining] = useState(null);
  const [fetchError, setFetchError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/hangouts');
      setSessions(data);
    } catch {
      setFetchError('Could not load sessions. Refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // Client-side guard: hide any sessions that expired since last fetch
  const active = sessions.filter(s => new Date(s.expires_at) > Date.now());

  async function handleJoin(sessionId) {
    if (!user) { navigate('/login'); return; }
    setJoining(sessionId);
    try {
      const { data } = await api.post(`/hangouts/${sessionId}/join`);
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, attendee_count: data.attendee_count, joined: 1 } : s
      ));
    } catch (err) {
      if (err.response?.status === 409) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, joined: 1 } : s));
      }
    } finally {
      setJoining(null);
    }
  }

  function handleCreated(session) {
    setSessions(prev => [session, ...prev]);
  }

  function handleCancel(sessionId) {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }

  return (
    <div style={{ background: CREAM, minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>

        {/* Page header */}
        <div style={{ paddingTop: 52, paddingBottom: 40 }}>
          <h1 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(34px, 5vw, 52px)',
            fontWeight: 400, color: NAVY, margin: 0, lineHeight: 1.12,
          }}>
            Study Hangouts
          </h1>
          <p style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 16, color: '#6D665C', marginTop: 10, lineHeight: 1.5,
          }}>
            See who's studying right now — show up and make it a party.
          </p>
          <button
            onClick={() => user ? setShowModal(true) : navigate('/login')}
            style={{
              marginTop: 22, padding: '11px 26px', borderRadius: 99,
              background: NAVY, color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#142D54'; }}
            onMouseLeave={e => { e.currentTarget.style.background = NAVY; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Start a Session
          </button>
        </div>

        {/* Live count badge */}
        {!loading && active.length > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fff', border: '1px solid #E8E3DA',
            borderRadius: 99, padding: '5px 14px',
            marginBottom: 20,
            fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#342F29',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#16A34A',
              display: 'inline-block', flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(22,163,74,0.18)',
            }} />
            {active.length} session{active.length !== 1 ? 's' : ''} live now
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
            gap: 16,
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, height: 190,
                border: '1px solid #E8E3DA',
                animation: 'pulse 1.6s ease-in-out infinite',
                opacity: 0.55,
              }} />
            ))}
          </div>
        ) : fetchError ? (
          <p style={{ color: '#DC2626', fontFamily: 'var(--font-ui)', fontSize: 14 }}>{fetchError}</p>
        ) : active.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 20px',
            border: '2px dashed #D9D2C3', borderRadius: 20,
          }}>
            <div style={{ fontSize: 44, lineHeight: 1 }}>📚</div>
            <h3 style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 24, color: NAVY, marginTop: 14, fontWeight: 400,
            }}>
              No active sessions
            </h3>
            <p style={{
              fontFamily: "'Outfit', sans-serif",
              color: '#8D8577', marginTop: 8, fontSize: 15,
            }}>
              Be the first one out. Start a session and watch your friends show up.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
            gap: 16,
          }}>
            {active.map(s => (
              <SessionCard key={s.id} session={s} onJoin={handleJoin} joining={joining} onCancel={handleCancel} currentUser={user} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <StartSessionModal onClose={() => setShowModal(false)} onCreate={handleCreated} />
      )}
    </div>
  );
}
