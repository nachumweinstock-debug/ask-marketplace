import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AtSign, BookOpenCheck, Camera, Check, Copy, ExternalLink, GraduationCap, Heart, ImagePlus, QrCode, Share2, UserRound } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';
import CategoryPill from '../components/CategoryPill';

const IG_URL = 'https://www.instagram.com/uasklive?igsh=d2Y1eXM4NTltbDd4';

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
    <div className="profile-card" style={{ padding: '24px 28px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 20 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ProfileChecklist({ items, percent }) {
  return (
    <div className="profile-checklist-card">
      <div className="profile-checklist-head">
        <div>
          <div className="section-label">Complete your profile</div>
          <h2>{percent}% ready</h2>
          <p>Small upgrades that make your account feel real and help people trust who they are booking.</p>
        </div>
        <div className="profile-checklist-meter" aria-label={`${percent}% profile complete`}>
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="profile-checklist-items">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" onClick={item.onClick} className={`profile-checklist-item${item.done ? ' done' : ''}`}>
              <span className="profile-checklist-icon">
                {item.done ? <Check size={16} /> : <Icon size={16} />}
              </span>
              <span>
                <strong>{item.label}</strong>
                <em>{item.help}</em>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AccountProfile() {
  const { user: authUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const avatarRef = useRef(null);
  const majorRef = useRef(null);
  const interestsRef = useRef(null);

  const [form, setForm] = useState({
    name: '', username: '', user_bio: '', major: '', interests: '', classes_taking: '', gpa: '',
    zelle: '', venmo: '', phone: '', contact_pref: 'imessage',
  });
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    api.get('/account').then(({ data }) => {
      setProfile(data);
      setForm({
        name:           data.name || '',
        username:       data.username || '',
        user_bio:       data.user_bio || '',
        major:          data.major || '',
        interests:      data.interests || '',
        classes_taking: data.classes_taking || '',
        gpa:            data.gpa || '',
        zelle:          data.zelle || '',
        venmo:          data.venmo || '',
        phone:          data.phone || '',
        contact_pref:   data.contact_pref || 'imessage',
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
    setAvatarUploading(true);
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
      setAvatarUploading(false);
      if (avatarRef.current) avatarRef.current.value = '';
    };
    img.onerror = () => { setAvatarUploading(false); URL.revokeObjectURL(objectUrl); };
    img.src = objectUrl;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const payload = { ...form };
      if (avatarPreview) payload.avatar_data_url = avatarPreview;
      const { data: updated } = await api.put('/account', payload);
      // Sync profile and form with server-confirmed values
      setProfile(p => ({ ...p, ...updated }));
      setForm(f => ({
        ...f,
        name:           updated.name           ?? f.name,
        username:       updated.username       ?? f.username,
        user_bio:       updated.user_bio        ?? f.user_bio,
        major:          updated.major           ?? f.major,
        interests:      updated.interests       ?? f.interests,
        classes_taking: updated.classes_taking  ?? f.classes_taking,
        gpa:            updated.gpa             ?? f.gpa,
        zelle:          updated.zelle           ?? f.zelle,
        venmo:          updated.venmo           ?? f.venmo,
        phone:          updated.phone           ?? f.phone,
        contact_pref:   updated.contact_pref    ?? f.contact_pref,
      }));
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
      setMsg('Saved!');
      setTimeout(() => setMsg(''), 3000);
      // Refresh auth context in background (e.g. update Navbar avatar)
      refreshUser().catch(() => {});
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

  const displayCategory = profile?.custom_category || profile?.category || null;
  const username = form.username || profile?.username || '';
  const publicPath = username ? `/${username}` : `/people/${profile?.id}`;
  const profileUrl = `${window.location.origin}${publicPath}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(profileUrl)}`;
  const checklistItems = [
    {
      label: 'Add a profile photo',
      help: 'People recognize you faster.',
      done: !!(avatarPreview || profile?.avatar_url),
      icon: ImagePlus,
      onClick: () => avatarRef.current?.click(),
    },
    {
      label: 'Add your major',
      help: 'Makes your profile useful in search.',
      done: !!form.major.trim(),
      icon: GraduationCap,
      onClick: () => majorRef.current?.focus(),
    },
    {
      label: 'Add interests',
      help: 'Give the account some personality.',
      done: !!form.interests.trim(),
      icon: Heart,
      onClick: () => interestsRef.current?.focus(),
    },
    {
      label: 'Book your first instructor',
      help: 'Start using Ask for real.',
      done: Number(profile?.total_bookings || 0) > 0,
      icon: BookOpenCheck,
      onClick: () => { window.location.href = '/browse?category=tutor'; },
    },
  ];
  const checklistPercent = Math.round((checklistItems.filter(item => item.done).length / checklistItems.length) * 100);

  function copyProfileLink() {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    }).catch(() => setMsg('Could not copy link'));
  }

  async function shareProfileLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${form.name || 'My'} ASK profile`, url: profileUrl });
        return;
      } catch {
        return;
      }
    }
    copyProfileLink();
  }

  return (
    <div className="page profile-page">
      <div className="profile-hero">
        <div>
          <div className="section-label" style={{ marginBottom: 10 }}>Profile command center</div>
          <h1 className="profile-title">My Profile</h1>
          <p className="profile-subtitle">Tune how people see you, then share your profile anywhere.</p>
        </div>
        <a className="profile-ig" href={IG_URL} target="_blank" rel="noopener noreferrer">
          <Camera size={18} />
          <span>@uasklive</span>
        </a>
      </div>

      <form onSubmit={handleSave}>
        <ProfileChecklist items={checklistItems} percent={checklistPercent} />

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
                {avatarUploading ? (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  </div>
                ) : (
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
                )}
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
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Profile handle</label>
                <div style={{ position: 'relative' }}>
                  <AtSign size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input value={form.username} onChange={e => set('username')(e.target.value)}
                    placeholder="your-name"
                    style={{ ...fieldStyle, paddingLeft: 34, fontFamily: 'var(--font-mono)' }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>
                  Your clean link: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>uask.live/{username || 'your-handle'}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{profile?.email}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {profile?.role === 'provider' && displayCategory && (
                  <CategoryPill category={profile.category} customCategory={profile.custom_category} />
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

        <div className="profile-share-card">
          <div className="profile-share-main">
            <div className="profile-share-icon"><UserRound size={20} /></div>
            <div style={{ minWidth: 0 }}>
              <div className="profile-share-title">Share your ASK profile</div>
              <div className="profile-share-url">{profileUrl}</div>
            </div>
          </div>
          <div className="profile-share-actions">
            <button type="button" className="profile-icon-button" onClick={copyProfileLink} title="Copy profile link">
              <Copy size={16} />
              <span>{shareCopied ? 'Copied' : 'Copy'}</span>
            </button>
            <button type="button" className="profile-icon-button" onClick={shareProfileLink} title="Share profile">
              <Share2 size={16} />
              <span>Share</span>
            </button>
            <button type="button" className="profile-icon-button" onClick={() => setQrOpen(true)} title="Show QR code">
              <QrCode size={16} />
              <span>QR</span>
            </button>
            <a className="profile-icon-button" href={profileUrl} target="_blank" rel="noopener noreferrer" title="Open public profile">
              <ExternalLink size={16} />
              <span>Open</span>
            </a>
          </div>
        </div>

        <div className="profile-instagram-card">
          <div>
            <div className="profile-share-title">Help ASK grow on campus</div>
            <p>Follow us on Instagram and tag us when you share your profile.</p>
          </div>
          <a href={IG_URL} target="_blank" rel="noopener noreferrer">
            <Camera size={16} />
            Follow @uasklive
          </a>
        </div>

        {/* Academics */}
        <Section title="Academics">
          <div className="grid-2col" style={{ gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Major</label>
              <input value={form.major} onChange={e => set('major')(e.target.value)}
                placeholder="e.g. Biology, CS, Finance"
                ref={majorRef}
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
            <label style={labelStyle}>Interests</label>
            <input value={form.interests} onChange={e => set('interests')(e.target.value)}
              placeholder="e.g. startups, lifting, photography, Knicks"
              ref={interestsRef}
              style={fieldStyle}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5, marginBottom: 14 }}>Comma-separated. This shows what you are into beyond classes.</div>
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

        {/* Payment — shown for all users so it's remembered before/after becoming a provider */}
        <Section title="Payment Info">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            {profile?.role === 'provider'
              ? 'Shown on your listing so students know how to pay you.'
              : 'Save your Zelle/Venmo now — auto-filled when you post a listing.'}
          </p>
          <div className="grid-2col" style={{ gap: 14 }}>
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

        {/* Contact — phone for booking auto-messages */}
        <Section title="Contact Preferences">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            When you book a session, your phone number is included in the intro message so the provider can reach you.
          </p>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Phone number <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span></label>
            <input value={form.phone} onChange={e => set('phone')(e.target.value)}
              placeholder="e.g. 646-555-1234"
              style={fieldStyle}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Preferred contact app</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                {
                  id: 'imessage',
                  label: 'iMessage',
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                      <rect width="60" height="60" rx="13" fill="#1B8EF2"/>
                      {/* Back bubble (slightly lighter) */}
                      <path d="M38 10H22C16.477 10 12 14.477 12 20v10c0 5.523 4.477 10 10 10h2v7l7-7h7c5.523 0 10-4.477 10-10V20c0-5.523-4.477-10-10-10z" fill="rgba(255,255,255,0.35)"/>
                      {/* Front bubble */}
                      <path d="M42 16H26c-4.418 0-8 3.582-8 8v9c0 4.418 3.582 8 8 8h2v6l6-6h8c4.418 0 8-3.582 8-8v-9c0-4.418-3.582-8-8-8z" fill="white"/>
                    </svg>
                  ),
                },
                {
                  id: 'whatsapp',
                  label: 'WhatsApp',
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                      <rect width="60" height="60" rx="13" fill="#25D366"/>
                      {/* WhatsApp speech bubble outline */}
                      <path d="M30 8C17.85 8 8 17.85 8 30c0 3.9 1.05 7.55 2.88 10.68L8 52l11.65-2.85A21.87 21.87 0 0 0 30 52c12.15 0 22-9.85 22-22S42.15 8 30 8z" fill="rgba(255,255,255,0.2)"/>
                      {/* Phone handset */}
                      <path d="M43.8 36.23c-.74-.37-4.38-2.16-5.06-2.41-.68-.25-1.17-.37-1.67.37-.49.74-1.91 2.41-2.34 2.9-.43.49-.86.55-1.6.18-4.32-2.16-7.16-3.86-10.02-8.78-.75-1.3.75-1.2 2.15-4 .24-.49.12-.92-.06-1.3-.19-.37-1.67-4.02-2.28-5.5-.6-1.44-1.22-1.24-1.67-1.27-.43-.02-.92-.02-1.42-.02-.49 0-1.3.18-1.98.92-.68.74-2.6 2.54-2.6 6.2 0 3.65 2.66 7.17 3.03 7.67.37.49 5.21 7.95 12.63 11.16 4.69 2.02 6.53 2.19 8.87 1.84 1.42-.21 4.38-1.79 5-3.52.62-1.72.62-3.2.43-3.52-.18-.31-.68-.49-1.42-.86z" fill="white"/>
                    </svg>
                  ),
                },
              ].map(({ id, label, icon }) => {
                const active = form.contact_pref === id;
                return (
                  <button key={id} type="button" onClick={() => set('contact_pref')(id)}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary)' : 'var(--card)',
                      color: active ? '#fff' : 'var(--muted)',
                      cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-ui)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}>
                    {icon}{label}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

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

        <button type="submit" disabled={saving} className="profile-save-button" style={{
          background: saving ? '#93C5FD' : 'var(--primary)', color: '#fff',
          border: 'none', borderRadius: 999, padding: '12px 32px',
          fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-ui)', transition: 'opacity .15s',
        }}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      {qrOpen && (
        <div className="profile-modal-backdrop" onClick={() => setQrOpen(false)}>
          <div className="profile-qr-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-share-icon" style={{ margin: '0 auto 14px' }}><QrCode size={22} /></div>
            <h2>Your profile QR</h2>
            <p>{profileUrl}</p>
            <img src={qrSrc} alt="QR code for your ASK profile" />
            <div className="profile-share-actions" style={{ justifyContent: 'center', marginTop: 18 }}>
              <a className="profile-icon-button" href={qrSrc} download={`${username || 'ask'}-profile-qr.png`}>Download</a>
              <button type="button" className="profile-icon-button" onClick={() => setQrOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

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
