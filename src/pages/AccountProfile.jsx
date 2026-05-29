import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, BookOpenCheck, Camera, Check, Copy, ExternalLink, GraduationCap, Heart, ImagePlus, QrCode, Share2, UserRound } from 'lucide-react';
import { copyText } from '../lib/clipboard';
import { openUrl, APP_ORIGIN } from '../lib/browser';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../lib/media';
import CategoryPill from '../components/CategoryPill';

const IG_URL = 'https://www.instagram.com/uasklive?igsh=d2Y1eXM4NTltbDd4';

const CLASS_SUGGESTIONS = [
  // Math
  'Calculus I','Calculus II','Calculus III','Linear Algebra','Differential Equations',
  'Statistics','Discrete Mathematics','Real Analysis','Abstract Algebra','Number Theory',
  // Science
  'General Chemistry I','General Chemistry II','Organic Chemistry I','Organic Chemistry II',
  'General Biology I','General Biology II','Cell Biology','Molecular Biology',
  'Physics I','Physics II','Biochemistry','Microbiology','Genetics',
  'Anatomy','Physiology','Immunology','Neuroscience','Ecology',
  // CS
  'Intro to Computer Science','Data Structures','Algorithms','Computer Architecture',
  'Operating Systems','Databases','Web Development','Machine Learning',
  'Software Engineering','Computer Networks','Artificial Intelligence',
  // Business / Econ
  'Microeconomics','Macroeconomics','Accounting I','Accounting II',
  'Corporate Finance','Financial Accounting','Managerial Accounting',
  'Marketing','Business Law','Management','Investments','Econometrics',
  // Social Sciences
  'Psychology','Social Psychology','Abnormal Psychology','Cognitive Psychology',
  'Sociology','Political Science','International Relations','American History',
  'Modern History','Anthropology','Philosophy','Ethics','Logic',
  // Humanities / English
  'English Composition','Academic Writing','Literature','Speech Communication',
  'Public Speaking','Film Studies',
  // Jewish Studies
  'Gemara','Chumash','Jewish History','Jewish Philosophy','Halacha',
  'Tanach','Talmud','Mishnah','Jewish Ethics','Jewish Law',
  // Pre-health
  'MCAT Prep','Pre-Med Biology','Pre-Med Chemistry','Clinical Psychology',
];

function ClassSuggestInput({ value, onChange, inputRef, fieldStyle, labelStyle }) {
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);

  function getLastToken(val) {
    const parts = val.split(',');
    return parts[parts.length - 1].trimStart();
  }

  function replaceLastToken(val, replacement) {
    const parts = val.split(',');
    parts[parts.length - 1] = ' ' + replacement;
    return parts.join(',') + ', ';
  }

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);
    const token = getLastToken(val);
    if (token.length >= 1) {
      setSuggestions(
        CLASS_SUGGESTIONS
          .filter(s => s.toLowerCase().includes(token.toLowerCase()))
          .slice(0, 6)
      );
    } else {
      setSuggestions([]);
    }
    setActiveIdx(-1);
  }

  function pick(s) {
    onChange(replaceLastToken(value, s));
    setSuggestions([]);
    setActiveIdx(-1);
    inputRef?.current?.focus();
  }

  function handleKeyDown(e) {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); pick(suggestions[activeIdx]); }
    else if (e.key === 'Escape') setSuggestions([]);
    else if (e.key === 'Tab' && suggestions.length) { e.preventDefault(); pick(suggestions[activeIdx >= 0 ? activeIdx : 0]); }
  }

  return (
    <div style={{ position: 'relative' }}>
      <label style={labelStyle}>Classes I'm taking</label>
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setSuggestions([]), 160)}
        placeholder="e.g. Orgo I, Calc II, Micro Econ, Stats"
        style={fieldStyle}
        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
          background: '#fff', border: '1.5px solid var(--border)',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
          marginTop: 4,
        }}>
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => pick(s)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', fontSize: 13.5,
                background: i === activeIdx ? 'var(--accent)' : '#fff',
                color: i === activeIdx ? 'var(--primary)' : 'var(--text)',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                fontWeight: i === activeIdx ? 600 : 400,
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.background = i === activeIdx ? 'var(--accent)' : '#fff'}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>
        Comma-separated. Helps people find you for tutoring.
      </div>
    </div>
  );
}

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

function ProfileProgress({ items, percent }) {
  if (percent >= 100) return null;
  return (
    <div style={{
      background: '#17130F', borderRadius: 16,
      padding: '22px 24px 20px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400,
          color: '#FAF7F2', lineHeight: 1,
        }}>
          {percent}%
        </span>
        <span style={{ fontSize: 12.5, color: 'rgba(250,247,242,0.42)', fontWeight: 500 }}>
          profile complete
        </span>
      </div>
      <div style={{
        height: 3, background: 'rgba(255,255,255,0.1)',
        borderRadius: 2, marginBottom: 18, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${percent}%`,
          background: 'linear-gradient(90deg, #F59E0B, #F97316)',
          borderRadius: 2, transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {items.map(item => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 13px', borderRadius: 99,
              background: item.done ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${item.done ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}
          >
            <span style={{
              width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
              background: item.done ? '#F59E0B' : 'transparent',
              border: item.done ? 'none' : '1.5px solid rgba(255,255,255,0.22)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.done && <Check size={9} color="#17130F" />}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: item.done ? 'rgba(250,247,242,0.38)' : '#FAF7F2',
              textDecoration: item.done ? 'line-through' : 'none',
            }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AccountProfile() {
  const { user: authUser, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteWorking, setDeleteWorking] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [igFollowed, setIgFollowed] = useState(() => localStorage.getItem('ask_followed_instagram') === '1');
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [editMode, setEditMode] = useState(false);
  const avatarRef = useRef(null);
  const majorRef = useRef(null);
  const interestsRef = useRef(null);

  const [form, setForm] = useState({
    name: '', username: '', user_bio: '', university: '', major: '', interests: '', classes_taking: '', gpa: '',
    zelle: '', venmo: '', phone: '', contact_pref: 'imessage', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const isDirty = useMemo(() => JSON.stringify(form) !== savedSnapshot || !!avatarPreview, [form, savedSnapshot, avatarPreview]);

  useEffect(() => {
    api.get('/account').then(({ data }) => {
      setProfile(data);
      const nextForm = {
        name:           data.name || '',
        username:       data.username || '',
        user_bio:       data.user_bio || '',
        university:     data.university != null ? data.university : (localStorage.getItem('ask_profile_university') || ''),
        major:          data.major != null ? data.major : (localStorage.getItem('ask_profile_major') || ''),
        interests:      data.interests || '',
        classes_taking: data.classes_taking || '',
        gpa:            data.gpa || '',
        zelle:          data.zelle || '',
        venmo:          data.venmo || '',
        phone:          data.phone || '',
        contact_pref:   data.contact_pref || 'imessage',
        timezone:       data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      };
      setForm(nextForm);
      setSavedSnapshot(JSON.stringify(nextForm));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function warnBeforeUnload(e) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  function set(k) { return v => setForm(f => ({ ...f, [k]: v })); }

  function cancelEdit() {
    setForm(JSON.parse(savedSnapshot));
    setAvatarPreview(null);
    setEditMode(false);
  }

  async function deleteListing() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleteConfirm(false);
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
      const nextForm = {
        name:           updated.name || '',
        username:       updated.username || '',
        user_bio:       updated.user_bio || '',
        university:     updated.university || '',
        major:          updated.major || '',
        interests:      updated.interests || '',
        classes_taking: updated.classes_taking || '',
        gpa:            updated.gpa == null ? '' : String(updated.gpa),
        zelle:          updated.zelle || '',
        venmo:          updated.venmo || '',
        phone:          updated.phone || '',
        contact_pref:   updated.contact_pref || 'imessage',
        timezone:       updated.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      };
      setForm(nextForm);
      setSavedSnapshot(JSON.stringify(nextForm));
      setAvatarPreview(null);
      if (avatarRef.current) avatarRef.current.value = '';
      if (nextForm.university !== undefined) localStorage.setItem('ask_profile_university', nextForm.university);
      if (nextForm.major !== undefined) localStorage.setItem('ask_profile_major', nextForm.major);
      setMsg('Saved!');
      setTimeout(() => setMsg(''), 3000);
      setEditMode(false);
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
  const profileUrl = `${APP_ORIGIN}${publicPath}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(profileUrl)}`;
  function markInstagramFollowed() {
    localStorage.setItem('ask_followed_instagram', '1');
    setIgFollowed(true);
  }
  const checklistItems = [
    {
      label: 'Add a profile photo',
      help: 'People recognize you faster.',
      done: !!(avatarPreview || profile?.avatar_url),
      icon: ImagePlus,
      onClick: () => { setEditMode(true); setTimeout(() => avatarRef.current?.click(), 120); },
    },
    {
      label: 'Add your major',
      help: 'Makes your profile useful in search.',
      done: !!form.major.trim(),
      icon: GraduationCap,
      onClick: () => { setEditMode(true); setTimeout(() => majorRef.current?.focus(), 120); },
    },
    {
      label: 'Add interests',
      help: 'Give the account some personality.',
      done: !!form.interests.trim(),
      icon: Heart,
      onClick: () => { setEditMode(true); setTimeout(() => interestsRef.current?.focus(), 120); },
    },
    {
      label: 'Follow Ask on Instagram',
      help: 'Stay plugged into new instructors and promos.',
      done: igFollowed,
      icon: Camera,
      onClick: () => {
        markInstagramFollowed();
        window.open(IG_URL, '_blank', 'noopener,noreferrer');
      },
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

  async function copyProfileLink() {
    try { await copyText(profileUrl); } catch { setMsg('Could not copy link'); return; }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1800);
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
          <p className="profile-subtitle">
            {editMode ? "Editing your account — save when you're done." : 'Tune how people see you, then share your profile anywhere.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {!editMode && (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              style={{
                background: 'var(--primary)', color: '#fff',
                border: 'none', borderRadius: 99, padding: '9px 20px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Edit Account
            </button>
          )}
          <a className="profile-ig" href={IG_URL} target="_blank" rel="noopener noreferrer" onClick={markInstagramFollowed}>
            <Camera size={18} />
            <span>@uasklive</span>
          </a>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {editMode && (
          <div className="profile-save-rail">
            <div>
              <strong>{isDirty ? 'Unsaved changes' : 'No unsaved changes'}</strong>
              <span>{isDirty ? 'Save before leaving so nothing gets lost.' : 'All changes saved.'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={cancelEdit} disabled={saving} style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
                color: 'rgba(255,255,255,0.8)', borderRadius: 99, padding: '8px 18px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}>
                Cancel
              </button>
              <button type="submit" disabled={saving || !isDirty}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        <ProfileProgress items={checklistItems} percent={checklistPercent} />

        {/* Identity */}
        {!editMode ? (
          <div className="profile-card" style={{ padding: '28px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent)', color: 'var(--primary)', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 26, fontFamily: 'var(--font-ui)',
                border: '2.5px solid var(--border)',
              }}>
                {avatarPreview || mediaUrl(profile?.avatar_url) ? (
                  <img src={avatarPreview || mediaUrl(profile.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : initials(form.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 22, fontWeight: 760, color: 'var(--text)',
                  lineHeight: 1.15, marginBottom: 3, fontFamily: 'var(--font-display)',
                }}>
                  {form.name || <span style={{ color: 'var(--muted)', fontStyle: 'italic', fontWeight: 400, fontSize: 16 }}>No name set</span>}
                </div>
                {form.username && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                    @{form.username}
                  </div>
                )}
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{profile?.email}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {profile?.role === 'provider' && displayCategory && (
                    <CategoryPill category={profile.category} customCategory={profile.custom_category} />
                  )}
                  {authUser?.is_admin && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>Admin</span>
                  )}
                </div>
              </div>
            </div>
            {form.user_bio ? (
              <div style={{
                marginTop: 18, padding: '14px 16px',
                background: 'var(--bg)', borderRadius: 10,
                fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)',
                borderLeft: '3px solid var(--border)',
              }}>
                {form.user_bio}
              </div>
            ) : (
              <div style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                No bio yet — click Edit Account to add one.
              </div>
            )}
          </div>
        ) : (
          <Section title="Identity">
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
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
                  {authUser?.is_admin && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>Admin</span>
                  )}
                </div>
              </div>
            </div>
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
        )}

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
            <button type="button" className="profile-icon-button" onClick={() => openUrl(profileUrl)} title="Open public profile">
              <ExternalLink size={16} />
              <span>Open</span>
            </button>
          </div>
        </div>

        <div className="profile-instagram-card">
          <div>
            <div className="profile-share-title">Help ASK grow on campus</div>
            <p>Follow us on Instagram and tag us when you share your profile.</p>
          </div>
          <a href={IG_URL} target="_blank" rel="noopener noreferrer" onClick={markInstagramFollowed}>
            <Camera size={16} />
            Follow @uasklive
          </a>
        </div>

        {/* Academics */}
        <div className="profile-card" style={{ padding: '24px 28px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
            Academics
          </div>

          {!editMode ? (
            (form.university || form.major || form.interests || form.classes_taking) ? (
              <>
                {/* Credential card */}
                <div style={{
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  border: '1.5px solid #BFDBFE',
                  borderRadius: 14, padding: '18px 20px', marginBottom: 14,
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: '#1B3A6B', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <GraduationCap size={22} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, marginBottom: 3 }}>
                      {form.university || <span style={{ color: 'var(--muted)', fontWeight: 400, fontStyle: 'italic' }}>No university set</span>}
                    </div>
                    <div style={{ fontSize: 13.5, color: '#2563EB', fontWeight: 600, marginBottom: form.gpa || form.timezone ? 6 : 0 }}>
                      {form.major || <span style={{ color: 'var(--muted)', fontWeight: 400, fontStyle: 'italic' }}>No major set</span>}
                    </div>
                    {(form.gpa || form.timezone) && (
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {form.gpa && <span style={{ fontSize: 12, color: 'var(--muted)' }}>GPA: <strong style={{ color: 'var(--text)' }}>{form.gpa}</strong></span>}
                        {form.timezone && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{form.timezone}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {form.interests && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Interests</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {form.interests.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} style={{ fontSize: 12.5, padding: '4px 11px', borderRadius: 999, background: 'var(--accent)', color: 'var(--primary)', fontWeight: 500 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {form.classes_taking && (
                  <div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Classes this semester</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {form.classes_taking.split(',').map(t => t.trim()).filter(Boolean).map(cls => (
                        <span key={cls} style={{ fontSize: 12.5, padding: '4px 11px', borderRadius: 999, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 500 }}>{cls}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: '28px 20px', textAlign: 'center' }}>
                <GraduationCap size={28} style={{ color: 'var(--muted)', marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Add your academic info</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>University, major, and classes help people find the right match.</div>
              </div>
            )
          ) : (
            <>
              <div className="profile-field-grid" style={{ marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>University</label>
                  <input value={form.university} onChange={e => set('university')(e.target.value)}
                    placeholder="e.g. Yeshiva University"
                    style={fieldStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
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
                <div>
                  <label style={labelStyle}>Timezone</label>
                  <input value={form.timezone} onChange={e => set('timezone')(e.target.value)}
                    placeholder="America/New_York"
                    style={fieldStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Interests</label>
                <input value={form.interests} onChange={e => set('interests')(e.target.value)}
                  placeholder="e.g. startups, lifting, photography, Knicks"
                  ref={interestsRef}
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>Comma-separated.</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <ClassSuggestInput
                  value={form.classes_taking}
                  onChange={v => set('classes_taking')(v)}
                  inputRef={null}
                  fieldStyle={fieldStyle}
                  labelStyle={labelStyle}
                />
              </div>
            </>
          )}
        </div>

        {/* Payment — shown for all users so it's remembered before/after becoming a provider */}
        <div className="profile-card" style={{ padding: '24px 28px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
            Payment Info
          </div>

          {!editMode ? (
            (form.zelle || form.venmo) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {form.zelle && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                    border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '14px 16px',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                      background: '#6B21A8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 16, color: '#fff', fontWeight: 800, fontFamily: 'var(--font-ui)' }}>Z</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>Zelle</div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{form.zelle}</div>
                    </div>
                  </div>
                )}
                {form.venmo && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                    border: '1.5px solid #BFDBFE', borderRadius: 12, padding: '14px 16px',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                      background: '#008CFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 16, color: '#fff', fontWeight: 800, fontFamily: 'var(--font-ui)' }}>V</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>Venmo</div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>@{form.venmo}</div>
                    </div>
                  </div>
                )}
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>
                  {profile?.role === 'provider'
                    ? 'Shown on your listing so students know how to pay you.'
                    : 'Auto-filled when you post a listing.'}
                </p>
              </div>
            ) : (
              <div style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: '28px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>💳</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Add your payment info</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  {profile?.role === 'provider'
                    ? 'Shown on your listing so students know how to pay you.'
                    : 'Save now — auto-filled when you post a listing.'}
                </div>
              </div>
            )
          ) : (
            <>
              <div className="grid-2col" style={{ gap: 14, marginBottom: 20 }}>
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
            </>
          )}
        </div>

        {/* Contact */}
        {!editMode ? (
          <div className="profile-card" style={{ padding: '24px 28px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
              Contact
            </div>
            {form.phone ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: 'var(--bg)', border: '1.5px solid var(--border)',
                borderRadius: 10, padding: '10px 16px',
              }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{form.phone}</span>
              </div>
            ) : (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--bg)', border: '1.5px dashed var(--border)',
                borderRadius: 10, padding: '10px 16px',
              }}>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>No phone number added</span>
              </div>
            )}
            <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '12px 0 0', lineHeight: 1.5 }}>
              Phone is only used for ASK notifications and is not shared publicly.
            </p>
          </div>
        ) : (
          <Section title="Contact">
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Add a phone number for ASK text notifications. It is not shared publicly.
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
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {(profile?.total_bookings > 0) && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)' }}>{profile.total_bookings}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Total bookings</div>
              </div>
            )}
            {(profile?.completed_bookings > 0) && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)' }}>{profile.completed_bookings}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Completed</div>
              </div>
            )}
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)' }}>
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Member since</div>
            </div>
            {!(profile?.total_bookings > 0) && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <a href="/browse" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                  Browse services →
                </a>
              </div>
            )}
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

        {editMode && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" disabled={saving} className="profile-save-button" style={{
              background: saving ? '#93C5FD' : 'var(--primary)', color: '#fff',
              border: 'none', borderRadius: 999, padding: '12px 32px',
              fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-ui)', transition: 'opacity .15s',
            }}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
            <button type="button" onClick={cancelEdit} disabled={saving} style={{
              background: 'none', border: '1.5px solid var(--border)',
              borderRadius: 999, padding: '12px 24px', fontSize: 14,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
              color: 'var(--muted)', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
            >
              Cancel
            </button>
          </div>
        )}
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
                {deleteConfirm
                  ? 'Are you sure? This removes all availability, bookings, and reviews. Cannot be undone.'
                  : 'Removes your service, all availability slots, and booking history.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {deleteConfirm && (
                <button onClick={() => setDeleteConfirm(false)} style={{
                  background: 'none', border: '1.5px solid var(--border)', color: 'var(--muted)',
                  borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
                }}>
                  Cancel
                </button>
              )}
              <button onClick={deleteListing} disabled={deleteLoading} style={{
                background: deleteConfirm ? '#DC2626' : 'none',
                color: deleteConfirm ? '#fff' : '#DC2626',
                border: '1.5px solid #FECACA', borderRadius: 999, padding: '8px 20px',
                fontSize: 13, fontWeight: 600,
                cursor: deleteLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
                opacity: deleteLoading ? 0.6 : 1, whiteSpace: 'nowrap',
              }}>
                {deleteLoading ? 'Deleting...' : deleteConfirm ? 'Yes, delete' : 'Delete listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Danger zone ─────────────────────────────────────── */}
      <div style={{ marginTop: 32, border: '1.5px solid #FECACA', borderRadius: 12, padding: '20px 24px', background: '#FFF5F5' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#DC2626', marginBottom: 10 }}>
          Danger Zone
        </div>
        <p style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 16, lineHeight: 1.5 }}>
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => { setDeleteInput(''); setShowDeleteModal(true); }}
          style={{
            background: 'none', border: '1.5px solid #DC2626', borderRadius: 8,
            padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#DC2626',
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
          }}
        >
          Delete my account
        </button>
      </div>

      {/* ── Delete confirmation modal ────────────────────────── */}
      {showDeleteModal && (
        <div
          onClick={() => setShowDeleteModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(17,13,10,0.6)',
            zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 400, background: '#fff',
              borderRadius: 16, padding: '28px 24px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#DC2626', marginBottom: 10 }}>
              Delete account
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 20 }}>
              This will permanently delete your account, bookings, reviews, and messages. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="Type DELETE"
              style={{
                width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
                padding: '10px 14px', fontSize: 15, fontFamily: 'var(--font-ui)',
                marginBottom: 16, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#DC2626'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{
                  flex: 1, background: 'var(--gray-50)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px', fontSize: 13.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-ui)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteInput !== 'DELETE' || deleteWorking}
                onClick={async () => {
                  setDeleteWorking(true);
                  try {
                    await api.delete('/account');
                    await signOut();
                    navigate('/');
                  } catch {
                    setDeleteWorking(false);
                    setShowDeleteModal(false);
                    setMsg('Failed to delete account. Please try again.');
                  }
                }}
                style={{
                  flex: 1, background: deleteInput === 'DELETE' ? '#DC2626' : '#FECACA',
                  border: 'none', borderRadius: 8, padding: '10px',
                  fontSize: 13.5, fontWeight: 700, color: '#fff',
                  cursor: deleteInput === 'DELETE' ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-ui)', opacity: deleteWorking ? 0.6 : 1,
                }}
              >
                {deleteWorking ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
