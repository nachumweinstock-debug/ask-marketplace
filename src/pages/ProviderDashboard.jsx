import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';

const CAT_LABELS = { tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew', tennis: 'Tennis', other: 'Other' };
const STATUS = {
  pending:   { label: 'Pending',   bg: '#FFF8E6', color: '#92600A' },
  confirmed: { label: 'Confirmed', bg: '#F0FDF4', color: '#166534' },
  completed: { label: 'Completed', bg: 'var(--accent)', color: 'var(--primary)' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#DC2626' },
};
const TABS = ['bookings', 'availability'];

const inputStyle = {
  width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 13.5, outline: 'none',
  background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)',
  transition: 'border-color .15s', boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 };

export default function ProviderDashboard() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'bookings');
  const isNew = searchParams.get('new') === '1';

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({ date: '', start_time: '', end_time: '' });
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/providers/me/profile').then(r => setProfile(r.data)),
      api.get('/bookings/mine').then(r => setBookings(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile?.id) api.get(`/availability/${profile.id}`).then(r => setAvailability(r.data));
  }, [profile?.id]);

  async function addSlot() {
    setSlotError('');
    if (!newSlot.date || !newSlot.start_time || !newSlot.end_time) { setSlotError('All fields required'); return; }
    setSlotLoading(true);
    try {
      const { data } = await api.post('/availability', newSlot);
      setAvailability(a => [...a, data]);
      setNewSlot({ date: '', start_time: '', end_time: '' });
    } catch (err) { setSlotError(err.response?.data?.error || 'Failed'); }
    finally { setSlotLoading(false); }
  }

  async function removeSlot(id) {
    try { await api.delete(`/availability/${id}`); setAvailability(a => a.filter(s => s.id !== id)); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  async function updateBookingStatus(id, status) {
    try { await api.patch(`/bookings/${id}`, { status }); setBookings(bs => bs.map(b => b.id === id ? { ...b, status } : b)); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
  );

  const upcoming = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));
  const displayCat = profile?.custom_category || CAT_LABELS[profile?.category] || 'Other';

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '48px 32px 80px' }}>

      {isNew && (
        <div style={{
          background: 'var(--accent)', border: '1px solid #BFDBFE',
          borderRadius: 10, padding: '14px 18px', marginBottom: 28,
          fontSize: 13.5, color: 'var(--primary)',
        }}>
          <strong>You're live!</strong> Add availability below so students can book you.
        </div>
      )}

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>
          My Services
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          {displayCat} · Manage bookings and availability.
          {' '}
          <a href="/account" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Edit profile →</a>
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? 'var(--primary)' : 'var(--muted)',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            textTransform: 'capitalize', fontFamily: 'var(--font-ui)',
            transition: 'color .15s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Bookings */}
      {tab === 'bookings' && (
        <div>
          {bookings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text)', marginBottom: 10 }}>No bookings yet</div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>Add availability so students can book you.</div>
            </div>
          ) : (
            <div>
              {upcoming.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>
                    Upcoming ({upcoming.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {upcoming.map(b => (
                      <div key={b.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{b.student_name}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                            {b.student_email}
                            {' · '}
                            {new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {' · '}{b.start_time}–{b.end_time}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                            background: STATUS[b.status]?.bg, color: STATUS[b.status]?.color,
                          }}>
                            {STATUS[b.status]?.label}
                          </span>
                          {b.status === 'pending' && (
                            <button onClick={() => updateBookingStatus(b.id, 'confirmed')} style={{
                              background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0',
                              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              fontFamily: 'var(--font-ui)',
                            }}>Confirm</button>
                          )}
                          {b.status === 'confirmed' && (
                            <button onClick={() => updateBookingStatus(b.id, 'completed')} style={{
                              background: 'var(--accent)', color: 'var(--primary)', border: '1px solid #BFDBFE',
                              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              fontFamily: 'var(--font-ui)',
                            }}>Complete</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>Past Sessions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {past.map(b => (
                      <div key={b.id} className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.72 }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{b.student_name}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{b.date} · {b.start_time}</div>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                          background: STATUS[b.status]?.bg, color: STATUS[b.status]?.color,
                        }}>
                          {STATUS[b.status]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Availability */}
      {tab === 'availability' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Add Availability</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 12, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={newSlot.date} min={new Date().toISOString().split('T')[0]}
                onChange={e => setNewSlot(s => ({ ...s, date: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={labelStyle}>Start</label>
              <input type="time" value={newSlot.start_time}
                onChange={e => setNewSlot(s => ({ ...s, start_time: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={labelStyle}>End</label>
              <input type="time" value={newSlot.end_time}
                onChange={e => setNewSlot(s => ({ ...s, end_time: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <button onClick={addSlot} disabled={slotLoading} style={{
              background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 999,
              padding: '11px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap', fontFamily: 'var(--font-ui)',
            }}>
              {slotLoading ? '...' : '+ Add'}
            </button>
          </div>
          {slotError && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 14 }}>{slotError}</div>}

          {availability.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--muted)' }}>
              No slots yet — add some above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
              {availability.map(slot => (
                <div key={slot.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 16px', border: '1px solid var(--border)', borderRadius: 8,
                  background: 'var(--bg)',
                }}>
                  <div style={{ fontSize: 13.5, color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}{slot.start_time} – {slot.end_time}
                    {slot.is_booked && (
                      <span style={{ marginLeft: 10, fontSize: 11, background: '#FFF8E6', color: '#92600A', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>Booked</span>
                    )}
                  </div>
                  {!slot.is_booked && (
                    <button onClick={() => removeSlot(slot.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#DC2626', fontFamily: 'var(--font-ui)' }}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
