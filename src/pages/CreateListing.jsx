import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import SlotPicker, { SlotList } from '../components/SlotPicker';

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

function resizeToDataUrl(file, maxW, maxH, quality = 0.85) {
  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = objectUrl;
  });
}

function ImageDrop({ value, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef(null);

  async function processFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setProcessing(true);
    const dataUrl = await resizeToDataUrl(file, 1200, 600);
    onChange(dataUrl);
    setProcessing(false);
  }

  return (
    <div>
      <div
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 10, overflow: 'hidden',
          background: dragging ? 'var(--accent)' : 'var(--bg)',
          transition: 'all .15s', position: 'relative',
          cursor: value ? 'default' : 'pointer',
          minHeight: value ? 'auto' : 130,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {processing ? (
          <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Processing...</div>
          </div>
        ) : value ? (
          <>
            <img src={value} alt="listing" style={{ width: '100%', display: 'block', maxHeight: 220, objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
              <button type="button" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                Change
              </button>
              <button type="button" onClick={e => { e.stopPropagation(); onChange(null); }}
                style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 999, width: 26, height: 26, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ×
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 20px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8, lineHeight: 1 }}>🖼</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Drag a photo here, or click to browse</div>
            <div style={{ fontSize: 11.5, marginTop: 4 }}>Shows as a cover image on your listing card</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={e => processFile(e.target.files[0])} style={{ display: 'none' }} />
    </div>
  );
}

export default function CreateListing() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [sessionType, setSessionType] = useState('in-person');
  const [bio, setBio] = useState('');
  const [price, setPrice] = useState('');
  const [zelle, setZelle] = useState('');
  const [venmo, setVenmo] = useState('');
  const [listingImage, setListingImage] = useState(null);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [priceStats, setPriceStats] = useState(null);

  // Pre-fill payment info from saved account profile
  useEffect(() => {
    api.get('/account').then(({ data }) => {
      if (data.zelle) setZelle(data.zelle);
      if (data.venmo) setVenmo(data.venmo);
    }).catch(() => {});
  }, []);

  // Fetch market price data when category changes
  useEffect(() => {
    if (!category) { setPriceStats(null); return; }
    const cat = category === 'other' ? customCategory : category;
    if (!cat) { setPriceStats(null); return; }
    api.get('/providers/price-stats', { params: { category: cat } })
      .then(({ data }) => setPriceStats(data.count > 0 ? data : null))
      .catch(() => setPriceStats(null));
  }, [category, customCategory]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category) { setError('Select a category first'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/providers/become');
      await api.put('/providers/me', {
        category,
        custom_category: category === 'other' ? customCategory : '',
        session_type: sessionType,
        bio,
        price_per_session: price || 0,
        zelle,
        venmo,
        ...(listingImage ? { listing_image_data_url: listingImage } : {}),
      });

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
                      padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary)' : 'var(--card)',
                      color: active ? '#fff' : 'var(--muted)',
                      cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-ui)',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom category */}
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

          {/* Session type */}
          <div style={{ marginBottom: 20, marginTop: 16 }}>
            <label style={labelStyle}>How do you meet?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'in-person', label: 'In-Person', emoji: '📍' },
                { id: 'zoom',      label: 'Zoom',      emoji: '💻' },
                { id: 'both',      label: 'Both',      emoji: '🔀' },
              ].map(({ id, label, emoji }) => {
                const active = sessionType === id;
                return (
                  <button key={id} type="button" onClick={() => setSessionType(id)}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary)' : 'var(--card)',
                      color: active ? '#fff' : 'var(--muted)',
                      cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-ui)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    <span>{emoji}</span>{label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Listing image */}
          <div style={{ marginBottom: 20, marginTop: 0 }}>
            <label style={labelStyle}>Cover photo <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span></label>
            <ImageDrop value={listingImage} onChange={setListingImage} />
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 20 }}>
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

            {/* Market price suggestion banner */}
            {priceStats && (
              <div style={{
                background: '#F0FDF4', border: '1.5px solid #86EFAC',
                borderRadius: 9, padding: '10px 14px', marginBottom: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 2 }}>
                    Market rate for this category
                  </div>
                  <div style={{ fontSize: 12, color: '#15803D' }}>
                    {priceStats.count} provider{priceStats.count !== 1 ? 's' : ''} charging{' '}
                    <strong>${priceStats.min}–${priceStats.max}</strong>
                    {' '}· avg <strong>${priceStats.avg}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[priceStats.min, priceStats.avg, priceStats.max].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                    <button key={v} type="button"
                      onClick={() => setPrice(String(v))}
                      style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                        border: price === String(v) ? '1.5px solid #166534' : '1.5px solid #86EFAC',
                        background: price === String(v) ? '#166534' : '#DCFCE7',
                        color: price === String(v) ? '#fff' : '#166534',
                        cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      }}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
            Toggle multiple days at once — same time block applies to all selected days.
          </p>

          <SlotPicker
            onAdd={newSlots => setSlots(s => [...s, ...newSlots.map(sl => ({ ...sl, id: Date.now() + Math.random() }))])}
            existingSlots={slots}
          />
          <SlotList
            slots={slots}
            onRemove={id => setSlots(s => s.filter(sl => sl.id !== id))}
            emptyText="No slots yet — add some above or after publishing."
          />

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, padding: '9px 14px',
              fontSize: 12.5, color: '#DC2626', marginBottom: 16, marginTop: 16,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !category} style={{
            width: '100%', background: loading || !category ? '#93C5FD' : 'var(--primary)',
            color: '#fff', border: 'none', borderRadius: 9,
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
