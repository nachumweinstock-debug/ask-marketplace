import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Plus, Trash2, CheckCircle, Clock, Settings, Calendar, Sparkles } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['tutor', 'barber', 'hebrew tutor', 'tennis', 'other'];
const CATEGORY_LABELS = { tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew Tutor', tennis: 'Tennis', other: 'Other' };

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmed', color: 'text-green-700 bg-green-50 border-green-200' },
  completed: { label: 'Completed', color: 'text-slate-600 bg-slate-50 border-slate-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-600 bg-red-50 border-red-200' },
};

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'bookings');
  const isNewProvider = searchParams.get('tab') === 'profile';
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
          bio: r.data.bio || '',
          category: r.data.category || 'other',
          price_per_session: r.data.price_per_session || 0,
          zelle: r.data.zelle || '',
          venmo: r.data.venmo || '',
        });
      }),
      api.get('/bookings/mine').then(r => setBookings(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile?.id) {
      api.get(`/availability/${profile.id}`).then(r => setAvailability(r.data));
    }
  }, [profile?.id]);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const form = new FormData();
      Object.entries(profileForm).forEach(([k, v]) => form.append(k, v));
      if (avatarFile) form.append('avatar', avatarFile);
      const { data } = await api.put('/providers/me', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(data);
      setProfileMsg('Profile saved!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      setProfileMsg(err.response?.data?.error || 'Save failed');
    } finally {
      setProfileSaving(false);
    }
  }

  async function addSlot() {
    setSlotError('');
    if (!newSlot.date || !newSlot.start_time || !newSlot.end_time) return setSlotError('All fields required');
    setSlotLoading(true);
    try {
      const { data } = await api.post('/availability', newSlot);
      setAvailability(a => [...a, data]);
      setNewSlot({ date: '', start_time: '', end_time: '' });
    } catch (err) {
      setSlotError(err.response?.data?.error || 'Failed to add slot');
    } finally {
      setSlotLoading(false);
    }
  }

  async function removeSlot(id) {
    try {
      await api.delete(`/availability/${id}`);
      setAvailability(a => a.filter(s => s.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove');
    }
  }

  async function updateBookingStatus(id, status) {
    try {
      await api.patch(`/bookings/${id}`, { status });
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status } : b));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  }

  if (loading) return <div className="text-center py-16 text-slate-400">Loading...</div>;

  const upcomingBookings = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
  const pastBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {isNewProvider && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Sparkles size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 text-sm">You&apos;re now a provider!</p>
            <p className="text-blue-700 text-sm mt-0.5">Fill in your profile below, then add availability so students can book you.</p>
          </div>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Services</h1>
        <p className="text-slate-500 mt-1">Manage your profile, availability, and bookings</p>
      </div>

      <div className="flex gap-1 p-1 bg-amber-50 border border-amber-100 rounded-xl mb-7 w-fit">
        {[
          { id: 'bookings', label: 'Bookings', icon: Calendar },
          { id: 'availability', label: 'Availability', icon: Clock },
          { id: 'profile', label: 'Profile', icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'bookings' && (
        <div className="space-y-8">
          {bookings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="font-semibold text-slate-900 mb-2">No bookings yet</h3>
              <p className="text-slate-500 text-sm">Complete your profile and add availability to get started.</p>
            </div>
          ) : (
            <>
              {upcomingBookings.length > 0 && (
                <section>
                  <h2 className="text-base font-semibold text-slate-900 mb-3">Upcoming ({upcomingBookings.length})</h2>
                  <div className="space-y-3">
                    {upcomingBookings.map(b => (
                      <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="font-semibold text-slate-900">{b.student_name}</div>
                            <div className="text-slate-500 text-sm">{b.student_email}</div>
                            <div className="text-slate-600 text-sm mt-1 flex items-center gap-1">
                              <Clock size={13} />
                              {new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              · {b.start_time} – {b.end_time}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_CONFIG[b.status]?.color}`}>
                              {STATUS_CONFIG[b.status]?.label}
                            </span>
                            {b.status === 'pending' && (
                              <button onClick={() => updateBookingStatus(b.id, 'confirmed')}
                                className="flex items-center gap-1 bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 transition-colors">
                                <CheckCircle size={13} /> Confirm
                              </button>
                            )}
                            {b.status === 'confirmed' && (
                              <button onClick={() => updateBookingStatus(b.id, 'completed')}
                                className="flex items-center gap-1 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                <CheckCircle size={13} /> Mark Complete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {pastBookings.length > 0 && (
                <section>
                  <h2 className="text-base font-semibold text-slate-900 mb-3">Past Sessions</h2>
                  <div className="space-y-3">
                    {pastBookings.map(b => (
                      <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-4 opacity-70">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-slate-800">{b.student_name}</span>
                            <div className="text-slate-500 text-xs mt-0.5">{b.date} · {b.start_time}</div>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_CONFIG[b.status]?.color}`}>
                            {STATUS_CONFIG[b.status]?.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'availability' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-5">Manage Availability</h2>
          <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Add New Slot</h3>
            <div className="grid sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Date</label>
                <input type="date" value={newSlot.date} onChange={e => setNewSlot(s => ({ ...s, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Start Time</label>
                <input type="time" value={newSlot.start_time} onChange={e => setNewSlot(s => ({ ...s, start_time: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">End Time</label>
                <input type="time" value={newSlot.end_time} onChange={e => setNewSlot(s => ({ ...s, end_time: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            </div>
            {slotError && <p className="text-red-600 text-xs mb-2">{slotError}</p>}
            <button onClick={addSlot} disabled={slotLoading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Plus size={16} /> {slotLoading ? 'Adding...' : 'Add Slot'}
            </button>
          </div>
          {availability.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No availability slots yet. Add some above!</p>
          ) : (
            <div className="space-y-2">
              {availability.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Clock size={15} className="text-blue-500" />
                    <span className="text-sm text-slate-700 font-medium">
                      {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-slate-500 text-sm">{slot.start_time} – {slot.end_time}</span>
                    {slot.is_booked && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Booked</span>}
                  </div>
                  {!slot.is_booked && (
                    <button onClick={() => removeSlot(slot.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-5">Edit Profile</h2>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Profile Photo</label>
              <div className="flex items-center gap-4">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center">
                    <User size={24} className="text-blue-600" />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} className="text-sm text-slate-500" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Category</label>
                <select value={profileForm.category} onChange={e => setProfileForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Price per Session ($)</label>
                <input type="number" min="0" value={profileForm.price_per_session}
                  onChange={e => setProfileForm(f => ({ ...f, price_per_session: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Bio</label>
              <textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                rows={4} placeholder="Tell students about yourself, your experience, and what you offer..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Zelle Phone/Email</label>
                <input type="text" value={profileForm.zelle} onChange={e => setProfileForm(f => ({ ...f, zelle: e.target.value }))}
                  placeholder="e.g. 646-555-1234"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Venmo Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                  <input type="text" value={profileForm.venmo} onChange={e => setProfileForm(f => ({ ...f, venmo: e.target.value }))}
                    placeholder="your-venmo"
                    className="w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            {profileMsg && (
              <p className={`text-sm px-3 py-2 rounded-lg ${profileMsg.includes('saved') ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {profileMsg}
              </p>
            )}
            <button onClick={saveProfile} disabled={profileSaving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
