import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { fmtTime, fmtDay } from '../lib/slots';
import SlotPicker, { SlotList } from '../components/SlotPicker';
import { providerUrl } from '../lib/providerUrl';

function AddToCalendarButton({ bookingId }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  async function handleOpen() {
    if (!data) {
      try {
        const { data: d } = await api.get(`/bookings/${bookingId}/calendar`);
        setData(d);
      } catch { return; }
    }
    setOpen(o => !o);
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={handleOpen} style={{
        fontSize: 12, color: 'var(--primary)', background: 'var(--accent)',
        border: '1px solid #BFDBFE', borderRadius: 999, padding: '4px 10px',
        cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        📅 Calendar
      </button>
      {open && data && (
        <div style={{
          position: 'absolute', right: 0, top: 32, zIndex: 100,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: 200, overflow: 'hidden',
          animation: 'slideDown 0.15s ease both',
        }}>
          <a href={data.google} target="_blank" rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px', textDecoration: 'none',
              fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-ui)',
              borderBottom: '1px solid var(--border)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: 18 }}>📅</span>
            <div>
              <div style={{ fontWeight: 600 }}>Google Calendar</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Opens in browser</div>
            </div>
          </a>
          <a href={data.ics}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px', textDecoration: 'none',
              fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-ui)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: 18 }}></span>
            <div>
              <div style={{ fontWeight: 600 }}>Apple Calendar</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Downloads .ics · also works with Outlook</div>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}

const CAT_LABELS = { tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew', tennis: 'Tennis', other: 'Other' };

const CATEGORIES = [
  { id: 'tutor',     label: 'Tutoring'  },
  { id: 'barber',    label: 'Barber'    },
  { id: 'fitness',   label: 'Fitness'   },
  { id: 'languages', label: 'Languages' },
  { id: 'music',     label: 'Music'     },
  { id: 'torah',     label: 'Torah'     },
  { id: 'other',     label: 'Other'     },
];

const SUBCATEGORY_SUGGESTIONS = {
  tutor:     ['Math', 'Chemistry', 'Biology', 'Physics', 'Excel', 'Coding', 'English', 'History', 'Economics', 'SAT/ACT', 'Calculus', 'Statistics'],
  fitness:   ['Tennis', 'Golf', 'Basketball', 'Soccer', 'Baseball', 'Swimming', 'Squash', 'Yoga', 'Weightlifting', 'Running', 'Boxing', 'Volleyball'],
  languages: ['Hebrew', 'Ivrit', 'Spanish', 'French', 'Yiddish', 'Arabic', 'Russian', 'Mandarin', 'Italian', 'German'],
  music:     ['Guitar', 'Piano', 'Violin', 'Drums', 'Vocals', 'Bass', 'Ukulele', 'Flute', 'Music Theory', 'Saxophone'],
  torah:     ['Gemara', 'Halacha', 'Chumash', 'Mishna', 'Tefilla', 'Parsha', 'Tanach', 'Jewish History', 'Mussar', 'Chassidus'],
};
const STATUS = {
  pending:   { label: 'Pending',   bg: '#FFF8E6', color: '#92600A' },
  confirmed: { label: 'Confirmed', bg: '#F0FDF4', color: '#166534' },
  completed: { label: 'Completed', bg: 'var(--accent)', color: 'var(--primary)' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#DC2626' },
};
const TABS = [
  { id: 'bookings',     label: 'Sessions'  },
  { id: 'availability', label: 'Schedule'  },
];


export default function ProviderDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState(searchParams.get('tab') || 'bookings');
  const isNew = searchParams.get('new') === '1';
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageSaving, setImageSaving] = useState(false);
  const imageInputRef = useRef(null);
  const [imgDragging, setImgDragging] = useState(false);

  const [myListings, setMyListings] = useState([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [editModal, setEditModal] = useState(null); // { form }
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/providers/me/profile').then(r => setProfile(r.data)),
      api.get('/providers/mine').then(r => setMyListings(r.data)),
      api.get('/bookings/mine?as=provider').then(r => setBookings(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile?.id) api.get(`/availability/${profile.id}`).then(r => setAvailability(r.data));
  }, [profile?.id]);

  async function addSlots(newSlots) {
    setSlotLoading(true);
    try {
      const results = await Promise.all(
        newSlots.map(sl => api.post('/availability', sl).then(r => r.data))
      );
      setAvailability(a => [...a, ...results]);
    } catch (err) { alert(err.response?.data?.error || 'Failed to add slots'); }
    finally { setSlotLoading(false); }
  }

  async function removeSlot(id) {
    try { await api.delete(`/availability/${id}`); setAvailability(a => a.filter(s => s.id !== id)); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  async function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1200 / img.width, 600 / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      setImagePreview(canvas.toDataURL('image/jpeg', 0.85));
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  async function saveListingImage(url) {
    setImageSaving(true);
    try {
      await api.put(`/providers/${profile.id}`, { listing_image_data_url: url ?? null });
      setProfile(p => ({ ...p, listing_image: url ?? null }));
      setImagePreview(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to save image'); }
    finally { setImageSaving(false); }
  }

  async function deleteListing() {
    if (!confirm('Delete your listing? This removes all your availability slots and booking history. This cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/providers/${profile.id}`);
      await refreshUser();
      navigate('/dashboard/student');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete listing');
      setDeleteLoading(false);
    }
  }

  async function updateBookingStatus(id, status) {
    try { await api.patch(`/bookings/${id}`, { status }); setBookings(bs => bs.map(b => b.id === id ? { ...b, status } : b)); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  }

  function openEdit() {
    if (!profile) return;
    const CUSTOM_TO_CAT = { 'Torah Studies': 'torah', 'Languages': 'languages', 'Music': 'music' };
    const cat = CUSTOM_TO_CAT[profile.custom_category] || profile.category || 'other';
    setEditError('');
    setEditModal({
      form: {
        category: cat,
        custom_category: profile.custom_category || '',
        subcategory: profile.subcategory || '',
        bio: profile.bio || '',
        price_per_session: profile.price_per_session ?? '',
        zelle: profile.zelle || '',
        venmo: profile.venmo || '',
        session_type: profile.session_type || 'in-person',
      },
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditError(''); setEditLoading(true);
    const { form } = editModal;
    const CUSTOM_CAT_MAP = { torah: 'Torah Studies', languages: 'Languages', music: 'Music' };
    const isCustom = !!CUSTOM_CAT_MAP[form.category];
    try {
      const { data } = await api.put(`/providers/${profile.id}`, {
        category: isCustom ? 'other' : form.category,
        custom_category: isCustom ? CUSTOM_CAT_MAP[form.category] : (form.category === 'other' ? form.custom_category : ''),
        subcategory: ['tutor', 'fitness', 'torah', 'languages', 'music'].includes(form.category) ? form.subcategory : '',
        bio: form.bio,
        price_per_session: form.price_per_session === '' ? 0 : Number(form.price_per_session),
        zelle: form.zelle,
        venmo: form.venmo,
        session_type: form.session_type,
      });
      setProfile(p => ({ ...p, ...data }));
      setEditModal(null);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Save failed');
    } finally {
      setEditLoading(false);
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
  );

  const upcoming = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));
  const displayCat = profile?.custom_category || CAT_LABELS[profile?.category] || 'Other';

  return (
    <div className="page" style={{ maxWidth: 840 }}>

      {isNew && (
        <div style={{
          background: 'var(--accent)', border: '1px solid #BFDBFE',
          borderRadius: 10, padding: '14px 18px', marginBottom: 28,
          fontSize: 13.5, color: 'var(--primary)',
        }}>
          <strong>You're live!</strong> Add availability below so students can book you.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>
            My Listings
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            {displayCat} · Manage bookings and availability.
            {' '}
            <a href="/account" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Edit profile →</a>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={openEdit} style={{
            background: 'none', border: '1.5px solid #BFDBFE', color: '#1D4ED8',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
          }}>
            Edit listing
          </button>
          <a href="/create-listing" style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-ui)', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            + Add another listing
          </a>
          <button onClick={deleteListing} disabled={deleteLoading} style={{
            background: 'none', border: '1.5px solid #FECACA', color: '#DC2626',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: deleteLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
            opacity: deleteLoading ? 0.6 : 1, transition: 'all .15s', whiteSpace: 'nowrap',
          }}
            onMouseEnter={e => { if (!deleteLoading) e.currentTarget.style.background = '#FEF2F2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            {deleteLoading ? 'Deleting...' : 'Delete this listing'}
          </button>
        </div>
      </div>

      {/* Share your listing */}
      {profile?.id && (() => {
        const profileUrl = `${window.location.origin}${providerUrl(user?.name, profile.id, user?.username)}`;
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(profileUrl)}`;
        return (
          <>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 20px', marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                  Your profile link
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)',
                  wordBreak: 'break-all', lineHeight: 1.5,
                }}>
                  {profileUrl}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(profileUrl).then(() => {
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    });
                  }}
                  style={{
                    fontSize: 13, fontWeight: 600,
                    color: shareCopied ? '#166534' : 'var(--primary)',
                    background: shareCopied ? '#F0FDF4' : 'var(--accent)',
                    border: `1.5px solid ${shareCopied ? '#BBF7D0' : '#BFDBFE'}`,
                    borderRadius: 999, padding: '8px 16px',
                    cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    transition: 'all .15s',
                  }}
                >
                  {shareCopied ? '✓ Copied!' : '🔗 Copy link'}
                </button>
                <button
                  onClick={() => setQrOpen(true)}
                  style={{
                    fontSize: 13, fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'var(--gray-100)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 999, padding: '8px 16px',
                    cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-200)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--gray-100)'}
                >
                  QR Code
                </button>
              </div>
            </div>

            {/* QR Code modal */}
            {qrOpen && (
              <div
                onClick={() => setQrOpen(false)}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 2000, padding: 24,
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'var(--white)', borderRadius: 20,
                    padding: '32px 28px', maxWidth: 340, width: '100%',
                    textAlign: 'center', boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                    Your QR Code
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
                    {profileUrl}
                  </div>
                  <img
                    src={qrSrc}
                    alt="QR code"
                    style={{ width: 220, height: 220, borderRadius: 12, border: '1px solid var(--border)' }}
                  />
                  <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <a
                      href={qrSrc}
                      download={`${user?.username || 'qr'}-ask.png`}
                      style={{
                        fontSize: 13, fontWeight: 600,
                        color: 'var(--primary)', background: 'var(--accent)',
                        border: '1.5px solid #BFDBFE',
                        borderRadius: 999, padding: '9px 20px',
                        textDecoration: 'none', fontFamily: 'var(--font-ui)',
                      }}
                    >
                      Download
                    </a>
                    <button
                      onClick={() => setQrOpen(false)}
                      style={{
                        fontSize: 13, fontWeight: 600,
                        color: 'var(--muted)', background: 'var(--gray-100)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 999, padding: '9px 20px',
                        cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* All listings overview */}
      {myListings.length > 1 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Your {myListings.length} listings
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {myListings.map(l => {
              const isActive = l.id === profile?.id;
              const cat = l.custom_category || l.category;
              return (
                <div key={l.id} style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                  background: isActive ? 'var(--accent)' : 'var(--card)',
                  color: isActive ? 'var(--primary)' : 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ textTransform: 'capitalize' }}>{cat}</span>
                  {l.price_per_session > 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>${l.price_per_session}</span>}
                  {l.pending_bookings > 0 && (
                    <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                      {l.pending_bookings}
                    </span>
                  )}
                  {!isActive && (
                    <button onClick={() => { setProfile(l); }} style={{
                      background: 'none', border: 'none', fontSize: 11, color: 'var(--primary)',
                      cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 600, padding: 0,
                    }}>
                      Manage
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: tab === id ? 600 : 400,
            color: tab === id ? 'var(--primary)' : 'var(--muted)',
            borderBottom: tab === id ? '2px solid var(--primary)' : '2px solid transparent',
            fontFamily: 'var(--font-ui)',
            transition: 'color .15s',
          }}>
            {label}
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
                      <div key={b.id} className="card" style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{b.student_name}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                              {b.student_email}
                              {' · '}
                              {fmtDay(b.date)}
                              {' · '}{fmtTime(b.start_time)}–{fmtTime(b.end_time)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                              background: STATUS[b.status]?.bg, color: STATUS[b.status]?.color,
                            }}>
                              {STATUS[b.status]?.label}
                            </span>
                            <Link to={`/chat/${b.id}`} style={{
                              fontSize: 12, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none',
                              padding: '5px 12px', borderRadius: 999, border: '1px solid #BFDBFE',
                              background: 'var(--accent)',
                            }}>Chat</Link>
                            {b.status === 'pending' && (
                              <button onClick={() => updateBookingStatus(b.id, 'confirmed')} style={{
                                background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0',
                                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'var(--font-ui)',
                              }}>Confirm</button>
                            )}
                            {b.status === 'confirmed' && (
                              <>
                                <AddToCalendarButton bookingId={b.id} />
                                <button onClick={() => updateBookingStatus(b.id, 'completed')} style={{
                                  background: 'var(--accent)', color: 'var(--primary)', border: '1px solid #BFDBFE',
                                  padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                  fontFamily: 'var(--font-ui)',
                                }}>Complete</button>
                              </>
                            )}
                          </div>
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
                      <div key={b.id} className="card" style={{ padding: '14px 20px', opacity: 0.72 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{b.student_name}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{fmtDay(b.date)} · {fmtTime(b.start_time)}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <Link to={`/chat/${b.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                              Chat
                            </Link>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                              background: STATUS[b.status]?.bg, color: STATUS[b.status]?.color,
                            }}>
                              {STATUS[b.status]?.label}
                            </span>
                          </div>
                        </div>
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
        <div>
          {/* Listing cover image */}
          <div className="card" style={{ padding: '24px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
              Cover Photo
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setImgDragging(true); }}
              onDragLeave={() => setImgDragging(false)}
              onDrop={e => { e.preventDefault(); setImgDragging(false); handleImageFile(e.dataTransfer.files[0]); }}
              onClick={() => !(imagePreview || profile?.listing_image) && imageInputRef.current?.click()}
              style={{
                border: `2px dashed ${imgDragging ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 10, overflow: 'hidden', position: 'relative',
                background: imgDragging ? 'var(--accent)' : 'var(--bg)',
                transition: 'all .15s',
                cursor: imagePreview || profile?.listing_image ? 'default' : 'pointer',
                minHeight: imagePreview || profile?.listing_image ? 'auto' : 110,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {imagePreview || profile?.listing_image ? (
                <>
                  <img src={imagePreview || profile.listing_image} alt="listing"
                    style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                    <button type="button" onClick={e => { e.stopPropagation(); imageInputRef.current?.click(); }}
                      style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                      Change
                    </button>
                    <button type="button" onClick={e => { e.stopPropagation(); if (imagePreview) { setImagePreview(null); } else { saveListingImage(null); } }}
                      style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 999, width: 26, height: 26, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ×
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 28, marginBottom: 6, lineHeight: 1 }}>🖼</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Drag a photo or click to browse</div>
                  <div style={{ fontSize: 11.5, marginTop: 3 }}>Shown on your listing card</div>
                </div>
              )}
            </div>
            <input ref={imageInputRef} type="file" accept="image/*"
              onChange={e => handleImageFile(e.target.files[0])} style={{ display: 'none' }} />
            {imagePreview && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => saveListingImage(imagePreview)} disabled={imageSaving}
                  style={{ background: imageSaving ? '#93C5FD' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  {imageSaving ? 'Saving...' : 'Save photo'}
                </button>
                <button onClick={() => setImagePreview(null)}
                  style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--muted)', borderRadius: 999, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>

        {/* Session type quick edit */}
        {profile && (
          <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
              How do you meet?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'in-person', label: 'In-Person', emoji: '📍' },
                { id: 'zoom',      label: 'Zoom',      emoji: '💻' },
                { id: 'both',      label: 'Both',      emoji: '🔀' },
              ].map(({ id, label, emoji }) => {
                const active = (profile.session_type || 'in-person') === id;
                return (
                  <button key={id} type="button"
                    onClick={async () => {
                      try {
                        await api.put(`/providers/${profile.id}`, { session_type: id });
                        setProfile(p => ({ ...p, session_type: id }));
                      } catch { alert('Failed to update'); }
                    }}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: 10, fontSize: 12.5, fontWeight: 500,
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary)' : 'var(--card)',
                      color: active ? '#fff' : 'var(--muted)',
                      cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-ui)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}>
                    <span>{emoji}</span>{label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: '28px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Add Availability</div>

          <SlotPicker
            onAdd={addSlots}
            existingSlots={availability}
            addLabel={slotLoading ? 'Saving...' : '+ Add slots'}
          />
          <SlotList
            slots={availability}
            onRemove={removeSlot}
            emptyText="No slots yet — add some above."
          />
        </div>
        </div>
      )}

      {/* Edit listing modal */}
      {editModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
        }} onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: '28px 28px 24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Edit Listing</div>
              <button onClick={() => setEditModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', padding: 4 }}>✕</button>
            </div>
            <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => setEditModal(m => ({ ...m, form: { ...m.form, category: c.id, subcategory: '', custom_category: '' } }))}
                      style={{
                        padding: '5px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--font-ui)', border: '1.5px solid',
                        borderColor: editModal.form.category === c.id ? 'var(--primary)' : 'var(--border)',
                        background: editModal.form.category === c.id ? 'var(--accent)' : '#fff',
                        color: editModal.form.category === c.id ? 'var(--primary)' : 'var(--text)',
                      }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {editModal.form.category === 'other' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Service name</label>
                  <input value={editModal.form.custom_category}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, custom_category: e.target.value } }))}
                    placeholder="e.g. Photography, Golf Lessons…"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {SUBCATEGORY_SUGGESTIONS[editModal.form.category] && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
                    {{ tutor: 'Subject', languages: 'Language', music: 'Instrument', fitness: 'Sport', torah: 'Topic' }[editModal.form.category]}
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                    {SUBCATEGORY_SUGGESTIONS[editModal.form.category].map(s => (
                      <button key={s} type="button"
                        onClick={() => setEditModal(m => ({ ...m, form: { ...m.form, subcategory: m.form.subcategory === s ? '' : s } }))}
                        style={{
                          padding: '3px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                          fontFamily: 'var(--font-ui)', border: '1.5px solid',
                          borderColor: editModal.form.subcategory === s ? 'var(--primary)' : 'var(--border)',
                          background: editModal.form.subcategory === s ? 'var(--accent)' : '#fff',
                          color: editModal.form.subcategory === s ? 'var(--primary)' : 'var(--text)',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <input value={editModal.form.subcategory}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, subcategory: e.target.value } }))}
                    placeholder="Or type your own…"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Description</label>
                <textarea value={editModal.form.bio}
                  onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, bio: e.target.value } }))}
                  rows={4} required
                  style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Price / session ($)</label>
                  <input type="number" min="0" max="10000" value={editModal.form.price_per_session}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, price_per_session: e.target.value } }))}
                    placeholder="0"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Session type</label>
                  <select value={editModal.form.session_type}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, session_type: e.target.value } }))}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', background: '#fff', boxSizing: 'border-box' }}>
                    <option value="in-person">In-person</option>
                    <option value="zoom">Zoom</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Zelle</label>
                  <input value={editModal.form.zelle}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, zelle: e.target.value } }))}
                    placeholder="Phone or email"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Venmo</label>
                  <input value={editModal.form.venmo}
                    onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, venmo: e.target.value } }))}
                    placeholder="@handle"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {editError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#DC2626' }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setEditModal(null)} style={{
                  border: '1.5px solid var(--border)', background: 'none', color: 'var(--muted)',
                  borderRadius: 999, padding: '9px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} style={{
                  background: editLoading ? '#93C5FD' : 'var(--primary)', color: '#fff', border: 'none',
                  borderRadius: 999, padding: '9px 24px', fontSize: 13, fontWeight: 600,
                  cursor: editLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
                }}>
                  {editLoading ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
