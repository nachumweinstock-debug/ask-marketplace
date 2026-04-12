import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['tutor', 'barber', 'hebrew tutor', 'tennis', 'other'];
const CAT_LABELS = { tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew', tennis: 'Tennis', other: 'Other' };
const STATUS = {
  pending:   { label: 'Pending',   bg: '#FFF8E6', color: '#92600A' },
  confirmed: { label: 'Confirmed', bg: '#F0FDF4', color: '#166534' },
  completed: { label: 'Completed', bg: 'var(--accent)', color: 'var(--primary)' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#DC2626' },
};
const TABS = ['bookings', 'availability', 'profile'];

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

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'bookings');
  const isNew = searchParams.get('new') === '1';

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [newSlot, setNewSlot] = useState({ date: '', start_time: '', end_time: '' });
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/providers/me/profile').then(r => {
        setProfile(r.data);
        setProfileForm({
          bio: r.data.bio || '', category: r.data.category || 'other',
          price_per_session: r.data.price_per_session || 0,
          zelle: r.data.zelle || '', venmo: r.data.venmo || '',
        });
      }),
      api.get('/bookings/mine').then(r => setBookings(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile?.id) api.get(`/availability/${profile.id}`).then(r => setAvailability(r.data));
  }, [profile?.id]);

  async function saveProfile() {
    setProfileSaving(true); setProfileMsg('');
    try {
      const form = new FormData();
      Object.entries(profileForm).forEach(([k, v]) => form.append(k, v));
      if (avatarFile) form.append('avatar', avatarFile);
      const { data } = await api.put('/providers/me', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(data); setProfileMsg('Saved!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) { setProfileMsg(err.response?.data?.error || 'Save failed'); }
    finally { setProfileSaving(false); }
  }

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
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Manage your bookings, availability, and profile.</p>
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
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>Complete your profile and add availability to get started.</div>
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
                            }}>
                              Confirm
                            </button>
                          )}
                          {b.status === 'confirmed' && (
                            <button onClick={() => updateBookingStatus(b.id, 'completed')} style={{
                              background: 'var(--accent)', color: 'var(--primary)', border: '1px solid #BFDBFE',
                              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              fontFamily: 'var(--font-ui)',
                            }}>
                              Complete
                            </button>
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

      {/* Profile */}
      {tab === 'profile' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 22 }}>Edit Profile</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={profileForm.category} onChange={e => setProfileForm(f => ({ ...f, category: e.target.value }))}
                style={{ ...inputStyle }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Price per session ($)</label>
              <input type="number" min="0" value={profileForm.price_per_session} placeholder="0"
                onChange={e => setProfileForm(f => ({ ...f, price_per_session: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Bio</label>
            <textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
              rows={3} placeholder="Describe what you offer..."
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Zelle</label>
              <input type="text" value={profileForm.zelle} placeholder="646-555-1234"
                onChange={e => setProfileForm(f => ({ ...f, zelle: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={labelStyle}>Venmo</label>
              <input type="text" value={profileForm.venmo} placeholder="@username"
                onChange={e => setProfileForm(f => ({ ...f, venmo: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Profile Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--accent)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-ui)',
                }}>
                  {initials(user?.name)}
                </div>
              )}
              <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])}
                style={{ fontSize: 12.5, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }} />
            </div>
          </div>

          {profileMsg && (
            <div style={{
              fontSize: 12.5, padding: '9px 14px', borderRadius: 8, marginBottom: 16,
              background: profileMsg === 'Saved!' ? '#F0FDF4' : '#FEF2F2',
              color: profileMsg === 'Saved!' ? '#166534' : '#DC2626',
              border: `1px solid ${profileMsg === 'Saved!' ? '#BBF7D0' : '#FECACA'}`,
            }}>
              {profileMsg}
            </div>
          )}

          <button onClick={saveProfile} disabled={profileSaving} style={{
            background: profileSaving ? '#93C5FD' : 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 999, padding: '11px 28px',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-ui)', transition: 'opacity .15s',
          }}>
            {profileSaving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      )}
    </div>
  );
}
