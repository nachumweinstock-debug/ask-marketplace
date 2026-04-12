import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';
import { supabase } from '../lib/supabase';

const CATEGORY_LABELS = {
  tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew Tutor',
  tennis: 'Tennis', other: 'Other',
};

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Stars({ rating }) {
  return (
    <span style={{ letterSpacing: 1 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= rating ? '#F59E0B' : '#E5E0D8', fontSize: 14 }}>★</span>
      ))}
    </span>
  );
}

const fieldStyle = {
  width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 13.5, outline: 'none',
  background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)',
  transition: 'border-color .15s', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: 'var(--muted)', marginBottom: 6,
};

function Section({ title, children }) {
  return (
    <div className="card" style={{ padding: '24px 28px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 20 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function AccountProfile() {
  const { user: authUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const avatarRef = useRef(null);

  const [form, setForm] = useState({
    name: '', user_bio: '', major: '', classes_taking: '', gpa: '',
    zelle: '', venmo: '',
  });
  const [pwForm, setPwForm] = useState({ newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    api.get('/account').then(({ data }) => {
      setProfile(data);
      setForm({
        name:           data.name || '',
        user_bio:       data.user_bio || '',
        major:          data.major || '',
        classes_taking: data.classes_taking || '',
        gpa:            data.gpa || '',
        zelle:          data.zelle || '',
        venmo:          data.venmo || '',
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  function set(k) { return v => setForm(f => ({ ...f, [k]: v })); }

  async function deleteListing() {
    if (!confirm('Delete your listing? This removes all your availability, bookings, and reviews. This cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      await api.delete('/providers/me');
      await refreshUser();
      setProfile(p => ({ ...p, role: 'student', provider_profile_id: null, rating: null, review_count: null, recent_reviews: null }));
      setMsg('Listing deleted.');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to delete listing');
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const MAX = 400;
      let w = img.width, h = img.height;
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else       { w = Math.round(w * MAX / h); h = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      setAvatarPreview(canvas.toDataURL('image/jpeg', 0.85));
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (pwForm.newPassword.length < 6) return setPwMsg('Password must be at least 6 characters.');
    if (pwForm.newPassword !== pwForm.confirm) return setPwMsg('Passwords do not match.');
    setPwSaving(true); setPwMsg('');
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    if (error) {
      setPwMsg(error.message || 'Failed to update password.');
    } else {
      setPwForm({ newPassword: '', confirm: '' });
      setPwMsg('Password updated!');
      setTimeout(() => setPwMsg(''), 4000);
    }
    setPwSaving(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const payload = { ...form };
      if (avatarPreview) payload.avatar_data_url = avatarPreview;
      const { data: updated } = await api.put('/account', payload);
      setProfile(p => ({ ...p, avatar_url: updated.avatar_url }));
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
      await refreshUser();
      setMsg('Saved!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
    </div>
  );

  const displayCategory = profile?.custom_category || CATEGORY_LABELS[profile?.category] || null;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>
        My Profile
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32 }}>
        How the community sees you.
      </p>

      <form onSubmit={handleSave}>

        {/* Identity card */}
        <Section title="Identity">
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
            {/* Avatar */}
            <div style={{ flexShrink: 0 }}>
              <div
                onClick={() => avatarRef.current?.click()}
                style={{
                  width: 80, height: 80, borderRadius: '50%', cursor: 'pointer',
                  background: 'var(--accent)', color: 'var(--primary)', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 26, fontFamily: 'var(--font-ui)',
                  border: '2px solid var(--border)', position: 'relative',
                }}
              >
                {avatarPreview || mediaUrl(profile?.avatar_url) ? (
                  <img src={avatarPreview || mediaUrl(profile.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : initials(form.name)}
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity .15s',
                  color: '#fff', fontSize: 11, fontWeight: 600,
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                >
                  Edit
                </div>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </div>

            {/* Name + badges */}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Full Name</label>
                <input value={form.name} onChange={e => set('name')(e.target.value)}
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{profile?.email}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {profile?.role === 'provider' && displayCategory && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999, background: 'var(--accent)', color: 'var(--primary)' }}>
                    {displayCategory}
                  </span>
                )}
                {authUser?.is_admin ? (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>
                    Admin
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label style={labelStyle}>About me</label>
            <textarea value={form.user_bio} onChange={e => set('user_bio')(e.target.value)} rows={3}
              placeholder="Tell the community a bit about yourself..."
              style={{ ...fieldStyle, resize: 'none', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </Section>

        {/* Academics */}
        <Section title="Academics">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Major</label>
              <input value={form.major} onChange={e => set('major')(e.target.value)}
                placeholder="e.g. Biology, CS, Finance"
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={labelStyle}>GPA</label>
              <input value={form.gpa} onChange={e => set('gpa')(e.target.value)}
                placeholder="e.g. 3.8 / 4.0"
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Classes I'm taking</label>
            <input value={form.classes_taking} onChange={e => set('classes_taking')(e.target.value)}
              placeholder="e.g. Orgo I, Calc II, Micro Econ, Stats"
              style={fieldStyle}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>Comma-separated. Helps people find you for tutoring.</div>
          </div>
        </Section>

        {/* Payment — providers only */}
        {profile?.role === 'provider' && (
          <Section title="Payment Info">
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Students will use these to pay you after sessions.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Zelle (phone or email)</label>
                <input value={form.zelle} onChange={e => set('zelle')(e.target.value)}
                  placeholder="646-555-1234"
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <label style={labelStyle}>Venmo username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>@</span>
                  <input value={form.venmo} onChange={e => set('venmo')(e.target.value)}
                    placeholder="username"
                    style={{ ...fieldStyle, paddingLeft: 26 }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Ratings — providers only */}
        {profile?.role === 'provider' && (
          <Section title="My Ratings">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--text)', lineHeight: 1 }}>
                  {profile.rating > 0 ? profile.rating.toFixed(1) : '—'}
                </div>
                <Stars rating={Math.round(profile.rating || 0)} />
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {profile.review_count || 0} review{profile.review_count !== 1 ? 's' : ''}
                </div>
              </div>
              {profile.provider_profile_id && (
                <Link to={`/providers/${profile.provider_profile_id}`} style={{
                  fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600,
                }}>
                  View public profile →
                </Link>
              )}
            </div>

            {profile.recent_reviews?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {profile.recent_reviews.map((r, i) => (
                  <div key={r.id} style={{
                    borderBottom: i < profile.recent_reviews.length - 1 ? '1px solid var(--border)' : 'none',
                    paddingBottom: i < profile.recent_reviews.length - 1 ? 14 : 0,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.student_name}</span>
                      <Stars rating={r.rating} />
                    </div>
                    {r.comment && <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>{r.comment}</p>}
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, opacity: 0.7 }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>No reviews yet. Once students book and complete sessions, they can leave reviews.</p>
            )}
          </Section>
        )}

        {/* Stats */}
        <Section title="Activity">
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)' }}>{profile?.total_bookings || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Total bookings</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)' }}>{profile?.completed_bookings || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Completed</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)' }}>
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Member since</div>
            </div>
          </div>
        </Section>

        {msg && (
          <div style={{
            fontSize: 13, padding: '10px 16px', borderRadius: 8, marginBottom: 16,
            background: msg === 'Saved!' || msg === 'Listing deleted.' ? '#F0FDF4' : '#FEF2F2',
            color: msg === 'Saved!' || msg === 'Listing deleted.' ? '#166534' : '#DC2626',
            border: `1px solid ${msg === 'Saved!' || msg === 'Listing deleted.' ? '#BBF7D0' : '#FECACA'}`,
          }}>
            {msg}
          </div>
        )}

        <button type="submit" disabled={saving} style={{
          background: saving ? '#93C5FD' : 'var(--primary)', color: '#fff',
          border: 'none', borderRadius: 999, padding: '12px 32px',
          fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-ui)', transition: 'opacity .15s',
        }}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      {/* Security */}
      <div className="card" style={{ padding: '24px 28px', marginTop: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 20 }}>
          Security
        </div>
        <form onSubmit={handlePasswordChange}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>New Password</label>
              <input
                type="password"
                value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="At least 6 characters"
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat new password"
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>
          {pwMsg && (
            <div style={{
              fontSize: 13, padding: '9px 14px', borderRadius: 8, marginBottom: 12,
              background: pwMsg === 'Password updated!' ? '#F0FDF4' : '#FEF2F2',
              color: pwMsg === 'Password updated!' ? '#166534' : '#DC2626',
              border: `1px solid ${pwMsg === 'Password updated!' ? '#BBF7D0' : '#FECACA'}`,
            }}>
              {pwMsg}
            </div>
          )}
          <button type="submit" disabled={pwSaving || !pwForm.newPassword} style={{
            background: pwSaving || !pwForm.newPassword ? '#93C5FD' : 'var(--primary)',
            color: '#fff', border: 'none', borderRadius: 999, padding: '10px 24px',
            fontSize: 13, fontWeight: 600, cursor: pwSaving || !pwForm.newPassword ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)',
          }}>
            {pwSaving ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>

      {/* Danger zone — providers only */}
      {profile?.role === 'provider' && (
        <div style={{ marginTop: 32, border: '1.5px solid #FECACA', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#DC2626', marginBottom: 10 }}>
            Danger Zone
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Delete listing</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                Removes your service, all availability slots, and booking history.
              </div>
            </div>
            <button onClick={deleteListing} disabled={deleteLoading} style={{
              background: 'none', border: '1.5px solid #FECACA', color: '#DC2626',
              borderRadius: 999, padding: '8px 20px', fontSize: 13, fontWeight: 600,
              cursor: deleteLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
              opacity: deleteLoading ? 0.6 : 1, whiteSpace: 'nowrap',
            }}>
              {deleteLoading ? 'Deleting...' : 'Delete listing'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
