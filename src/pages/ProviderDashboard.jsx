import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { fmtTime, fmtDay } from '../lib/slots';
import SlotPicker, { SlotList } from '../components/SlotPicker';

const CAT_LABELS = { tutor: 'Tutor', barber: 'Barber', 'hebrew tutor': 'Hebrew', tennis: 'Tennis', other: 'Other' };
const STATUS = {
  pending:   { label: 'Pending',   bg: '#FFF8E6', color: '#92600A' },
  confirmed: { label: 'Confirmed', bg: '#F0FDF4', color: '#166534' },
  completed: { label: 'Completed', bg: 'var(--accent)', color: 'var(--primary)' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#DC2626' },
};
const TABS = ['bookings', 'availability'];


export default function ProviderDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
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

  useEffect(() => {
    Promise.all([
      api.get('/providers/me/profile').then(r => setProfile(r.data)),
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
      await api.put('/providers/me', { listing_image_data_url: url ?? null });
      setProfile(p => ({ ...p, listing_image: url ?? null }));
      setImagePreview(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to save image'); }
    finally { setImageSaving(false); }
  }

  async function deleteListing() {
    if (!confirm('Delete your listing? This removes all your availability slots and booking history. This cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      await api.delete('/providers/me');
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

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>
            My Services
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            {displayCat} · Manage bookings and availability.
            {' '}
            <a href="/account" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Edit profile →</a>
          </p>
        </div>
        <button onClick={deleteListing} disabled={deleteLoading} style={{
          background: 'none', border: '1.5px solid #FECACA', color: '#DC2626',
          borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 600,
          cursor: deleteLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
          opacity: deleteLoading ? 0.6 : 1, transition: 'all .15s', whiteSpace: 'nowrap',
        }}
          onMouseEnter={e => { if (!deleteLoading) e.currentTarget.style.background = '#FEF2F2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          {deleteLoading ? 'Deleting...' : 'Delete listing'}
        </button>
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
                            {fmtDay(b.date)}
                            {' · '}{fmtTime(b.start_time)}–{fmtTime(b.end_time)}
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
                          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{fmtDay(b.date)} · {fmtTime(b.start_time)}</div>
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
    </div>
  );
}
