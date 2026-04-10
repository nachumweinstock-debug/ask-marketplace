import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const BLUE = '#2B6CB0';

const INPUT = {
  width: '100%', border: '1px solid #E2E8F0', borderRadius: 8,
  padding: '10px 12px', fontSize: 13, outline: 'none',
  background: '#fff', color: '#1A1A2E',
};
const LABEL = { fontSize: 12, fontWeight: 500, color: '#64748B', marginBottom: 5, display: 'block' };

const CATEGORIES = ['tutor', 'barber', 'hebrew tutor', 'tennis', 'other'];
const CAT_LABELS = { tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew', tennis: 'Tennis', other: 'Other' };
const STATUS = {
  pending:   { label: 'Pending',   bg: '#FFF8E6', color: '#92600A' },
  confirmed: { label: 'Confirmed', bg: '#F0FFF4', color: '#166534' },
  completed: { label: 'Completed', bg: '#EBF4FF', color: '#1D4ED8' },
  cancelled: { label: 'Cancelled', bg: '#FFF0F0', color: '#b91c1c' },
};

const TABS = ['bookings', 'availability', 'profile'];

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
        setProfileForm({ bio: r.data.bio || '', category: r.data.category || 'other', price_per_session: r.data.price_per_session || 0, zelle: r.data.zelle || '', venmo: r.data.venmo || '' });
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

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8', fontSize: 13 }}>Loading...</div>;

  const upcoming = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 48px' }}>

      {isNew && (
        <div style={{ background: '#EBF4FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1D4ED8' }}>
          <strong>You're live!</strong> Add availability below so students can book you.
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A2E' }}>My Services</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Manage your bookings, availability, and profile</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2E8F0', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? BLUE : '#64748B',
            borderBottom: tab === t ? `2px solid ${BLUE}` : '2px solid transparent',
            textTransform: 'capitalize',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Bookings */}
      {tab === 'bookings' && (
        <div>
          {bookings.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A2E', marginBottom: 6 }}>No bookings yet</div>
              <div style={{ fontSize: 13, color: '#64748B' }}>Complete your profile and add availability to get started.</div>
            </div>
          ) : (
            <div>
              {upcoming.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: '#64748B', textTransform: 'uppercase', marginBottom: 10 }}>
                    Upcoming ({upcoming.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {upcoming.map(b => (
                      <div key={b.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E' }}>{b.student_name}</div>
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                            {b.student_email} · {new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {b.start_time}–{b.end_time}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: STATUS[b.status]?.bg, color: STATUS[b.status]?.color }}>
                            {STATUS[b.status]?.label}
                          </span>
                          {b.status === 'pending' && (
                            <button onClick={() => updateBookingStatus(b.id, 'confirmed')} style={{ background: '#F0FFF4', color: '#166534', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                              Confirm
                            </button>
                          )}
                          {b.status === 'confirmed' && (
                            <button onClick={() => updateBookingStatus(b.id, 'completed')} style={{ background: '#EBF4FF', color: '#1D4ED8', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
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
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: '#64748B', textTransform: 'uppercase', marginBottom: 10 }}>Past Sessions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {past.map(b => (
                      <div key={b.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.7 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{b.student_name}</div>
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{b.date} · {b.start_time}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: STATUS[b.status]?.bg, color: STATUS[b.status]?.color }}>
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
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 16 }}>Add Availability</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 10, alignItems: 'end' }}>
            <div>
              <label style={LABEL}>Date</label>
              <input type="date" value={newSlot.date} min={new Date().toISOString().split('T')[0]}
                onChange={e => setNewSlot(s => ({ ...s, date: e.target.value }))} style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Start</label>
              <input type="time" value={newSlot.start_time}
                onChange={e => setNewSlot(s => ({ ...s, start_time: e.target.value }))} style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>End</label>
              <input type="time" value={newSlot.end_time}
                onChange={e => setNewSlot(s => ({ ...s, end_time: e.target.value }))} style={INPUT} />
            </div>
            <button onClick={addSlot} disabled={slotLoading} style={{
              background: BLUE, color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 16px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {slotLoading ? '...' : '+ Add'}
            </button>
          </div>
          {slotError && <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>{slotError}</div>}

          {availability.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: '#94A3B8' }}>No slots yet — add some above</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {availability.map(slot => (
                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                  <div style={{ fontSize: 13, color: '#1A1A2E' }}>
                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}{slot.start_time} – {slot.end_time}
                    {slot.is_booked && <span style={{ marginLeft: 8, fontSize: 11, background: '#FFF8E6', color: '#92600A', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>Booked</span>}
                  </div>
                  {!slot.is_booked && (
                    <button onClick={() => removeSlot(slot.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#b91c1c' }}>Remove</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile */}
      {tab === 'profile' && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 16 }}>Edit Profile</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={LABEL}>Category</label>
              <select value={profileForm.category} onChange={e => setProfileForm(f => ({ ...f, category: e.target.value }))} style={{ ...INPUT }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Price per session ($)</label>
              <input type="number" min="0" value={profileForm.price_per_session}
                onChange={e => setProfileForm(f => ({ ...f, price_per_session: e.target.value }))}
                style={INPUT} placeholder="0" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Bio</label>
            <textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
              rows={3} placeholder="Describe what you offer..."
              style={{ ...INPUT, resize: 'none', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={LABEL}>Zelle</label>
              <input type="text" value={profileForm.zelle} onChange={e => setProfileForm(f => ({ ...f, zelle: e.target.value }))} style={INPUT} placeholder="646-555-1234" />
            </div>
            <div>
              <label style={LABEL}>Venmo</label>
              <input type="text" value={profileForm.venmo} onChange={e => setProfileForm(f => ({ ...f, venmo: e.target.value }))} style={INPUT} placeholder="@username" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Profile Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid #E2E8F0' }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
              )}
              <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} style={{ fontSize: 12, color: '#64748B' }} />
            </div>
          </div>

          {profileMsg && (
            <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 14, background: profileMsg === 'Saved!' ? '#F0FFF4' : '#FFF0F0', color: profileMsg === 'Saved!' ? '#166534' : '#b91c1c' }}>
              {profileMsg}
            </div>
          )}

          <button onClick={saveProfile} disabled={profileSaving} style={{
            background: profileSaving ? '#93C5FD' : BLUE, color: '#fff', border: 'none',
            borderRadius: 8, padding: '11px 24px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            {profileSaving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      )}
    </div>
  );
}
