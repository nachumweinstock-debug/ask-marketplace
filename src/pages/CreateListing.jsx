import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { DAYS, fmtTime } from '../lib/slots';

const CATEGORIES = [
  { id: 'tutor',        label: 'Tutors'   },
  { id: 'barber',       label: 'Barbers'  },
  { id: 'hebrew tutor', label: 'Hebrew'   },
  { id: 'tennis',       label: 'Fitness'  },
  { id: 'other',        label: 'Other'    },
];

const BIO_PLACEHOLDERS = {
  tutor: 'e.g. I tutor Calc 1 & 2 and Orgo. 3 years experience, patient.',
  barber: 'e.g. Fades, lineups, beard trims. Clean cuts right on campus.',
  'hebrew tutor': 'e.g. Rashi, Gemara, conversational Hebrew — all levels.',
  tennis: 'e.g. USTA rated player, great with beginners and intermediates.',
  other: "Describe what you offer and who it's for...",
};

const inputStyle = {
  width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 13.5, outline: 'none',
  background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)',
  transition: 'border-color .15s', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: 'var(--muted)', marginBottom: 6,
};

function SectionHeader({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16, marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

export default function CreateListing() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  // Service details
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [bio, setBio] = useState('');
  const [price, setPrice] = useState('');
  const [zelle, setZelle] = useState('');
  const [venmo, setVenmo] = useState('');

  // Availability slots
  const [slots, setSlots] = useState([]);
  const [newSlot, setNewSlot] = useState({ date: '', start_time: '', end_time: '' });
  const [slotError, setSlotError] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function addSlot() {
    setSlotError('');
    if (!newSlot.date || !newSlot.start_time || !newSlot.end_time) {
      setSlotError('Fill in all three slot fields');
      return;
    }
    setSlots(s => [...s, { ...newSlot, id: Date.now() }]);
    setNewSlot({ date: '', start_time: '', end_time: '' });
  }

  function removeSlot(id) {
    setSlots(s => s.filter(sl => sl.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category) { setError('Select a category first'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/providers/become');
      await api.put('/providers/me', {
        category,
        custom_category: category === 'other' ? customCategory : '',
        bio,
        price_per_session: price || 0,
        zelle,
        venmo,
      });

      // Create all availability slots
      await Promise.all(slots.map(sl =>
        api.post('/availability', { date: sl.date, start_time: sl.start_time, end_time: sl.end_time })
      ));

      await refreshUser();
      navigate('/dashboard/provider');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 32px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>
          Post a listing
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Takes about a minute.</p>
      </div>

      <div className="card" style={{ padding: '32px 28px' }}>
        <form onSubmit={handleSubmit}>

          {/* Category */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>What do you offer?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(({ id, label }) => {
                const active = category === id;
                return (
                  <button key={id} type="button" onClick={() => setCategory(id)}
                    style={{
                      padding: '8px 20px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary)' : 'var(--card)',
                      color: active ? '#fff' : 'var(--muted)',
                      cursor: 'pointer', transition: 'all .15s',
                      fontFamily: 'var(--font-ui)',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom category for "other" */}
          {category === 'other' && (
            <div style={{ marginBottom: 20, marginTop: 12 }}>
              <label style={labelStyle}>What is it? (shown on your card)</label>
              <input value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                placeholder="e.g. Photography, Guitar Lessons, Meal Prep..."
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>
                This becomes your category label — "Photography", "Guitar Lessons", etc.
              </div>
            </div>
          )}

          {/* Bio */}
          <div style={{ marginBottom: 20, marginTop: 16 }}>
            <label style={labelStyle}>Describe what you offer</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              placeholder={BIO_PLACEHOLDERS[category] || BIO_PLACEHOLDERS.other}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Price */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Price per session</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13.5, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>$</span>
              <input type="number" min="0" placeholder="0" value={price}
                onChange={e => setPrice(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 28 }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>Leave 0 if free or negotiable</div>
          </div>

          {/* Payment */}
          <div style={{ marginBottom: 4 }}>
            <label style={labelStyle}>How do students pay you?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ ...labelStyle, marginBottom: 5 }}>Zelle (phone or email)</div>
                <input type="text" placeholder="646-555-1234" value={zelle}
                  onChange={e => setZelle(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <div style={{ ...labelStyle, marginBottom: 5 }}>Venmo username</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>@</span>
                  <input type="text" placeholder="username" value={venmo}
                    onChange={e => setVenmo(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 26 }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Availability */}
          <SectionHeader>When are you available?</SectionHeader>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Pick a day, set a time window, hit Add. You can add as many as you want.
          </p>

          {/* Day pills */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Day</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DAYS.map(day => {
                const active = newSlot.date === day;
                return (
                  <button key={day} type="button" onClick={() => setNewSlot(s => ({ ...s, date: day }))}
                    style={{
                      padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary)' : 'var(--card)',
                      color: active ? '#fff' : 'var(--muted)',
                      cursor: 'pointer', transition: 'all .15s',
                      fontFamily: 'var(--font-ui)',
                    }}>
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end', marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>From</label>
              <input type="time" value={newSlot.start_time}
                onChange={e => setNewSlot(s => ({ ...s, start_time: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={labelStyle}>To</label>
              <input type="time" value={newSlot.end_time}
                onChange={e => setNewSlot(s => ({ ...s, end_time: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <button type="button" onClick={addSlot} style={{
              background: 'var(--primary)', color: '#fff', border: 'none',
              borderRadius: 999, padding: '11px 20px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-ui)',
            }}>
              + Add
            </button>
          </div>

          {slotError && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{slotError}</div>}

          {/* Slot list */}
          {slots.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {slots.map(slot => (
                <div key={slot.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
                    <strong>{slot.date}</strong> · {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                  </span>
                  <button type="button" onClick={() => removeSlot(slot.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#DC2626', fontFamily: 'var(--font-ui)' }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {slots.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, padding: '10px 14px', border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center' }}>
              No slots added yet — you can add them now or after publishing.
            </div>
          )}

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, padding: '9px 14px',
              fontSize: 12.5, color: '#DC2626', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !category} style={{
            width: '100%', background: loading || !category ? '#93C5FD' : 'var(--primary)',
            color: '#fff', border: 'none', borderRadius: 999,
            padding: '13px', fontSize: 14, fontWeight: 600,
            cursor: loading || !category ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)', transition: 'opacity .15s', marginTop: 8,
          }}>
            {loading ? 'Publishing...' : `Publish listing${slots.length > 0 ? ` with ${slots.length} slot${slots.length > 1 ? 's' : ''}` : ''}`}
          </button>

        </form>
      </div>
    </div>
  );
}
