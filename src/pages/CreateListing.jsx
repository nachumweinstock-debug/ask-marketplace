import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import SlotPicker, { SlotList } from '../components/SlotPicker';
import { trackEvent } from '../lib/analytics';
import { hasSuggestion, suggestText } from '../lib/textSuggestions';

const CATEGORIES = [
  { id: 'tutor',     label: 'Instruction'   },
  { id: 'barber',    label: 'Barber'     },
  { id: 'fitness',   label: 'Fitness'    },
  { id: 'languages', label: 'Languages'  },
  { id: 'music',     label: 'Music'      },
  { id: 'torah',     label: 'Torah'      },
  { id: 'other',     label: 'Other'      },
];

const CAMPUS_OPTIONS = [
  { id: 'WILF', label: 'WILF' },
  { id: 'BEREN', label: 'BEREN' },
];

const BIO_PLACEHOLDERS = {
  tutor:     'e.g. I teach Calc 1 & 2 and Orgo. 3 years experience, patient.',
  barber:    'e.g. Fades, lineups, beard trims. Clean cuts by appointment.',
  fitness:   'e.g. USTA rated player, great with beginners and intermediates.',
  languages: 'e.g. Native Hebrew speaker — I teach conversational and written Ivrit for all levels.',
  music:     'e.g. Guitar teacher with 5 years experience. Acoustic and electric, all levels welcome.',
  torah:     'e.g. I teach Gemara and Halacha. Patient with all levels, from beginners to advanced.',
  other:     "Describe what you offer and who it's for...",
};

const SUBCATEGORY_SUGGESTIONS = {
  tutor:     ['Math', 'Chemistry', 'Biology', 'Physics', 'Excel', 'Coding', 'English', 'History', 'Economics', 'SAT/ACT', 'Calculus', 'Statistics'],
  fitness:   ['Tennis', 'Golf', 'Basketball', 'Soccer', 'Baseball', 'Swimming', 'Squash', 'Yoga', 'Weightlifting', 'Running', 'Boxing', 'Volleyball'],
  languages: ['Hebrew', 'Ivrit', 'Spanish', 'French', 'Yiddish', 'Arabic', 'Russian', 'Mandarin', 'Italian', 'German'],
  music:     ['Guitar', 'Piano', 'Violin', 'Drums', 'Vocals', 'Bass', 'Ukulele', 'Flute', 'Music Theory', 'Saxophone'],
  torah:     ['Gemara', 'Halacha', 'Chumash', 'Mishna', 'Tefilla', 'Parsha', 'Tanach', 'Jewish History', 'Mussar', 'Chassidus'],
};

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
          border: dragging ? '2px dashed var(--accent)' : '1px solid var(--cream-200)',
          borderRadius: 14, overflow: 'hidden',
          background: dragging ? '#FFF5F0' : 'var(--cream-50)',
          transition: 'all .15s', position: 'relative',
          cursor: value ? 'default' : 'pointer',
          minHeight: value ? 'auto' : 120,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {processing ? (
          <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, border: '2px solid var(--ink-900)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <div style={{ fontSize: 13, color: 'var(--ink-500)', fontFamily: 'var(--font-ui)' }}>Processing...</div>
          </div>
        ) : value ? (
          <>
            <img src={value} alt="listing" style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
              <button type="button" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                style={{ background: 'rgba(10,10,10,0.6)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                Change
              </button>
              <button type="button" onClick={e => { e.stopPropagation(); onChange(null); }}
                style={{ background: 'rgba(10,10,10,0.6)', color: '#fff', border: 'none', borderRadius: 8, width: 28, height: 28, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ×
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 20px', color: 'var(--ink-500)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10, opacity: 0.6 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-700)', fontFamily: 'var(--font-ui)' }}>
              Drop a photo, or click to upload
            </div>
            <div style={{ fontSize: 12, marginTop: 4, fontFamily: 'var(--font-ui)' }}>Shows as a cover on your listing card</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={e => processFile(e.target.files[0])} style={{ display: 'none' }} />
    </div>
  );
}

function TextSuggestion({ value, onApply }) {
  if (!value || !hasSuggestion(value)) return null;
  const suggestion = suggestText(value);
  return (
    <button type="button" onClick={() => onApply(suggestion)} style={{
      marginTop: 8,
      border: '1px solid #BFDBFE',
      background: '#EFF6FF',
      color: '#1D4ED8',
      borderRadius: 999,
      padding: '6px 11px',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
    }}>
      Apply spelling suggestion: {suggestion.slice(0, 80)}{suggestion.length > 80 ? '...' : ''}
    </button>
  );
}

// ── Live Preview Card ─────────────────────────────────────────────────────────
function LivePreview({ category, customCategory, subcategory, bio, price, listingImage, sessionType, campus }) {
  const label = subcategory || customCategory ||
    { tutor: 'Instruction', barber: 'Haircuts', fitness: 'Fitness', languages: 'Languages', music: 'Music', torah: 'Torah Studies', other: 'Service' }[category] || '';
  const eyebrow = (customCategory || { tutor: 'INSTRUCTION', barber: 'BARBER', fitness: 'FITNESS', languages: 'LANGUAGES', music: 'MUSIC', torah: 'TORAH STUDIES', other: 'SERVICE' }[category] || 'SERVICE').toUpperCase();
  const campusLabel = campus || 'WILF';
  const fmt = sessionType === 'zoom' ? { color: '#7C3AED', label: 'ZOOM' }
    : sessionType === 'both' ? { color: '#7C3AED', label: `ZOOM & IN-PERSON · ${campusLabel}` }
    : { color: '#0E8345', label: `IN-PERSON · ${campusLabel}` };

  const isEmpty = !category && !bio && !price;

  return (
    <div style={{
      position: 'sticky', top: 96,
      background: 'var(--cream-50)', border: '1px solid var(--cream-200)',
      borderRadius: 16, overflow: 'hidden',
      transition: 'all .15s',
    }}>
      {listingImage && (
        <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
          <img src={listingImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(10,10,10,0.3), transparent)' }} />
        </div>
      )}
      <div style={{ padding: 22 }}>
        {isEmpty ? (
          <div style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic',
            fontSize: 18, color: 'var(--ink-500)', opacity: 0.6,
            padding: '40px 0', textAlign: 'center',
          }}>
            Your listing appears here
          </div>
        ) : (
          <>
            {/* Format dot */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
              color: 'var(--ink-500)', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: fmt.color }} />
              {fmt.label}
            </div>

            {/* Eyebrow */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.08em', color: 'var(--ink-500)', marginBottom: 6,
            }}>
              {eyebrow}
            </div>

            {/* Title */}
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600,
              color: 'var(--ink-900)', lineHeight: 1.15, marginBottom: 10,
              fontOpticalSizing: 'auto',
              transition: 'opacity .15s',
            }}>
              {label || 'Your service'}
            </div>

            {/* Bio */}
            {bio && (
              <p style={{
                fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-700)',
                lineHeight: 1.55, marginBottom: 16,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {bio}
              </p>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--cream-200)', margin: '16px 0' }} />

            {/* Price */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 20,
              color: 'var(--ink-900)', display: 'flex', alignItems: 'baseline', gap: 4,
            }}>
              {price ? `$${price}` : 'Free'}
              {price > 0 && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 400, color: 'var(--ink-500)' }}>/session</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CreateListing() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [sessionType, setSessionType] = useState('in-person');
  const [campus, setCampus] = useState('WILF');
  const [bio, setBio] = useState('');
  const [price, setPrice] = useState('');
  const [zelle, setZelle] = useState('');
  const [venmo, setVenmo] = useState('');
  const [listingImage, setListingImage] = useState(null);
  const [allowGroup, setAllowGroup] = useState(false);
  const [maxGroupSize, setMaxGroupSize] = useState(4);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [priceStats, setPriceStats] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [photoSuggestions, setPhotoSuggestions] = useState([]);
  const photoDebounce = useRef(null);

  useEffect(() => {
    trackEvent('tutor_application_started', { page: 'create-listing' });
  }, []);

  useEffect(() => {
    api.get('/account').then(({ data }) => {
      if (data.zelle) setZelle(data.zelle);
      if (data.venmo) setVenmo(data.venmo);
      if (data.zelle || data.venmo) setPaymentOpen(true);
    }).catch(() => {});
  }, []);

  useEffect(() => { setSubcategory(''); setPhotoSuggestions([]); }, [category]);

  useEffect(() => {
    const CUSTOM_CAT_MAP = { torah: 'Torah Studies', languages: 'Languages', music: 'Music' };
    const query = subcategory || customCategory || CUSTOM_CAT_MAP[category] || category;
    if (!query || query === 'other') { setPhotoSuggestions([]); return; }
    if (photoDebounce.current) clearTimeout(photoDebounce.current);
    photoDebounce.current = setTimeout(() => {
      api.get('/providers/photo-suggestions', { params: { query } })
        .then(({ data }) => setPhotoSuggestions(data))
        .catch(() => {});
    }, 350);
  }, [category, subcategory, customCategory]);

  useEffect(() => {
    if (!category) { setPriceStats(null); return; }
    const catMap = { torah: 'Torah Studies', languages: 'Languages', music: 'Music', other: customCategory };
    const cat = catMap[category] ?? category;
    if (!cat) { setPriceStats(null); return; }
    const params = { category: cat };
    if (subcategory) params.subcategory = subcategory;
    api.get('/providers/price-stats', { params })
      .then(({ data }) => setPriceStats(data.count > 0 ? data : null))
      .catch(() => setPriceStats(null));
  }, [category, customCategory, subcategory]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category) { setError('Select a category first'); return; }
    if (!bio.trim() || bio.trim().length < 20) { setError('Add a description (at least 20 characters) so people know what you offer'); return; }
    setError(''); setLoading(true);
    try {
      const { data: becomeData } = await api.post('/providers/become');
      const profileId = becomeData.profile_id;
      const CUSTOM_CAT_MAP = { torah: 'Torah Studies', languages: 'Languages', music: 'Music' };
      const isCustom = !!CUSTOM_CAT_MAP[category];
      await api.put(`/providers/${profileId}`, {
        category: isCustom ? 'other' : category,
        custom_category: isCustom ? CUSTOM_CAT_MAP[category] : (category === 'other' ? customCategory : ''),
        subcategory: ['tutor', 'fitness', 'torah', 'languages', 'music'].includes(category) ? subcategory : '',
        session_type: sessionType,
        campus: sessionType === 'zoom' ? null : campus,
        bio,
        price_per_session: price || 0,
        zelle,
        venmo,
        allow_group: allowGroup,
        max_group_size: allowGroup ? maxGroupSize : 1,
        ...(listingImage ? { listing_image_data_url: listingImage } : {}),
      });

      await Promise.all(slots.map(sl =>
        api.post('/availability', { date: sl.date, start_time: sl.start_time, end_time: sl.end_time, provider_id: profileId })
      ));

      await refreshUser();
      trackEvent('tutor_application_submitted', {
        category,
        custom_category: customCategory,
        subcategory,
        slot_count: slots.length,
      });
      navigate('/dashboard/provider');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="create-listing-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 48px 100px' }}>

      {/* ── Two-column layout ── */}
      <div className="create-listing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 56, alignItems: 'start' }}>

        {/* ── LEFT: Form ── */}
        <div>
          {/* Header */}
          <div style={{ marginBottom: 40 }} className="fade-up">
            <div className="section-label" style={{ marginBottom: 10 }}>
              NEW LISTING · STEP 1 OF 1
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
              fontSize: 'clamp(36px, 4vw, 48px)', fontWeight: 600,
              color: 'var(--ink-900)', lineHeight: 1.1,
              letterSpacing: '-0.02em', marginBottom: 10,
            }}>
              Put something on the board.
            </h1>
            <p style={{
              fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 400,
              color: 'var(--ink-500)', maxWidth: 480,
            }}>
              Keep it honest. Keep it short. Students book the ones that sound like a person.
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* ── Category: segmented control ── */}
            <div style={{ marginBottom: 28 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 10 }}>What do you offer?</label>
              <div style={{
                display: 'inline-flex', background: 'var(--cream-50)',
                border: '1px solid var(--cream-300)', borderRadius: 12, padding: 3, gap: 2,
              }}>
                {CATEGORIES.map(({ id, label }) => {
                  const active = category === id;
                  return (
                    <button key={id} type="button" onClick={() => setCategory(id)} style={{
                      padding: '9px 20px', borderRadius: 10, border: 'none',
                      background: active ? 'var(--blue-600)' : 'transparent',
                      color: active ? '#fff' : 'var(--ink-500)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'var(--font-ui)', transition: 'all .2s',
                    }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Specialty / subcategory ── */}
            {SUBCATEGORY_SUGGESTIONS[category] && (
              <div style={{ marginBottom: 28 }}>
                <label className="section-label" style={{ display: 'block', marginBottom: 10 }}>
                  {{ tutor: 'SUBJECT', torah: 'TOPIC', languages: 'LANGUAGE', music: 'INSTRUMENT' }[category] || 'ACTIVITY'}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {SUBCATEGORY_SUGGESTIONS[category].map(s => {
                    const active = subcategory === s;
                    return (
                      <button key={s} type="button" onClick={() => setSubcategory(active ? '' : s)}
                        style={{
                          padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                          border: `1px solid ${active ? 'var(--blue-600)' : 'var(--cream-200)'}`,
                          background: active ? 'var(--blue-600)' : 'var(--cream-50)',
                          color: active ? '#fff' : 'var(--ink-500)',
                          cursor: 'pointer', transition: 'all .12s', fontFamily: 'var(--font-ui)',
                        }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                  placeholder={{ tutor: 'Or type your own: Organic Chemistry, LSAT...', torah: 'Or type your own: Tefilla, Moed, Nach...', languages: 'Or type your own: Yiddish, Sign Language...', music: 'Or type your own: Harp, Banjo, Clarinet...' }[category] || 'Or type your own...'}
                  className="input-underline"
                  spellCheck="true"
                />
                <TextSuggestion value={subcategory} onApply={setSubcategory} />
              </div>
            )}

            {/* ── Custom category ── */}
            {category === 'other' && (
              <div style={{ marginBottom: 28 }}>
                <label className="section-label" style={{ display: 'block', marginBottom: 10 }}>CATEGORY NAME</label>
                <input value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                  placeholder="e.g. Photography, Guitar Lessons, Meal Prep..."
                  className="input-underline"
                  spellCheck="true"
                />
                <TextSuggestion value={customCategory} onApply={setCustomCategory} />
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 8, fontFamily: 'var(--font-ui)' }}>
                  This becomes your category label on the card.
                </div>
              </div>
            )}

            {/* ── Session type: segmented ── */}
            <div style={{ marginBottom: 28 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 10 }}>FORMAT</label>
              <div style={{
                display: 'inline-flex', background: 'var(--cream-50)',
                border: '1px solid var(--cream-300)', borderRadius: 12, padding: 3, gap: 2,
              }}>
                {[
                  { id: 'in-person', label: 'In-Person' },
                  { id: 'zoom',      label: 'Zoom'      },
                  { id: 'both',      label: 'Both'      },
                ].map(({ id, label }) => {
                  const active = sessionType === id;
                  return (
                    <button key={id} type="button" onClick={() => setSessionType(id)} style={{
                      padding: '9px 20px', borderRadius: 10, border: 'none',
                      background: active ? 'var(--blue-600)' : 'transparent',
                      color: active ? '#fff' : 'var(--ink-500)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'var(--font-ui)', transition: 'all .2s',
                    }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {sessionType !== 'zoom' && (
              <div style={{ marginBottom: 28 }}>
                <label className="section-label" style={{ display: 'block', marginBottom: 10 }}>CAMPUS</label>
                <div style={{
                  display: 'inline-flex', background: 'var(--cream-50)',
                  border: '1px solid var(--cream-300)', borderRadius: 12, padding: 3, gap: 2,
                }}>
                  {CAMPUS_OPTIONS.map(({ id, label }) => {
                    const active = campus === id;
                    return (
                      <button key={id} type="button" onClick={() => setCampus(id)} style={{
                        padding: '9px 20px', borderRadius: 10, border: 'none',
                        background: active ? 'var(--blue-600)' : 'transparent',
                        color: active ? '#fff' : 'var(--ink-500)',
                        fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--font-ui)', transition: 'all .2s',
                      }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Group bookings ── */}
            <div style={{ marginBottom: 28 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 10 }}>GROUP SESSIONS</label>
              <button type="button" onClick={() => setAllowGroup(g => !g)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                <div style={{
                  width: 40, height: 22, borderRadius: 99,
                  background: allowGroup ? 'var(--blue-600)' : 'var(--cream-300)',
                  position: 'relative', transition: 'background .2s',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 2, transition: 'left .2s',
                    left: allowGroup ? 20 : 2,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-700)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                  Allow multiple people to book this slot together
                </span>
              </button>

              {allowGroup && (
                <div style={{ marginTop: 14, paddingLeft: 50 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
                    Max group size (including the booker)
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[2, 3, 4, 5, 6, 8, 10].map(n => (
                      <button key={n} type="button" onClick={() => setMaxGroupSize(n)} style={{
                        width: 38, height: 38, borderRadius: 8, fontSize: 13, fontWeight: 600,
                        border: `1.5px solid ${maxGroupSize === n ? 'var(--blue-600)' : 'var(--cream-300)'}`,
                        background: maxGroupSize === n ? 'var(--blue-600)' : 'var(--cream-50)',
                        color: maxGroupSize === n ? '#fff' : 'var(--ink-700)',
                        cursor: 'pointer', fontFamily: 'var(--font-mono)',
                      }}>{n}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Cover photo ── */}
            <div style={{ marginBottom: 28 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 10 }}>
                COVER PHOTO <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
              </label>
              <ImageDrop value={listingImage} onChange={setListingImage} />
              {photoSuggestions.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-500)', letterSpacing: '0.06em', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
                    SUGGESTED PHOTOS — click to use
                  </div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {photoSuggestions.map((url, i) => (
                      <button key={i} type="button" onClick={() => setListingImage(url)}
                        style={{
                          flexShrink: 0, width: 90, height: 60, padding: 0, border: 'none',
                          borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                          outline: listingImage === url ? '2.5px solid var(--blue-600)' : 'none',
                          outlineOffset: 2,
                        }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Bio ── */}
            <div style={{ marginBottom: 28 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 10 }}>DESCRIPTION <span style={{ color: 'var(--accent)' }}>*</span></label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                placeholder={BIO_PLACEHOLDERS[category] || BIO_PLACEHOLDERS.other}
                className="input-underline"
                spellCheck="true"
                style={{ resize: 'none', lineHeight: 1.6, borderBottom: `1px solid var(--cream-300)` }}
              />
              <TextSuggestion value={bio} onApply={setBio} />
            </div>

            {/* ── Price ── */}
            <div style={{ marginBottom: 28 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 10 }}>PRICE PER SESSION</label>

              {priceStats && (
                <div style={{
                  background: 'var(--cream-50)', border: '1px solid var(--cream-200)',
                  borderRadius: 12, padding: '12px 16px', marginBottom: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 8,
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 2, fontFamily: 'var(--font-ui)' }}>
                      Market rate
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', fontFamily: 'var(--font-ui)' }}>
                      {priceStats.count} provider{priceStats.count !== 1 ? 's' : ''} · ${priceStats.min}–${priceStats.max} · avg ${priceStats.avg}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[priceStats.min, priceStats.avg, priceStats.max].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                      <button key={v} type="button" onClick={() => setPrice(String(v))}
                        style={{
                          padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          border: `1px solid ${price === String(v) ? 'var(--blue-600)' : 'var(--cream-300)'}`,
                          background: price === String(v) ? 'var(--blue-600)' : 'var(--cream-50)',
                          color: price === String(v) ? '#fff' : 'var(--ink-700)',
                          cursor: 'pointer', fontFamily: 'var(--font-mono)',
                        }}>
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ position: 'relative', maxWidth: 200 }}>
                <span style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 500, color: 'var(--ink-500)',
                }}>$</span>
                <input type="number" min="0" placeholder="0" value={price}
                  onChange={e => setPrice(e.target.value)}
                  style={{
                    width: '100%', border: 'none', borderBottom: '1px solid var(--cream-300)',
                    padding: '10px 0 10px 24px', fontSize: 24, outline: 'none',
                    background: 'transparent', color: 'var(--ink-900)',
                    fontFamily: 'var(--font-mono)', fontWeight: 500,
                    transition: 'border-color .2s',
                  }}
                  onFocus={e => e.target.style.borderBottomColor = 'var(--ink-900)'}
                  onBlur={e => e.target.style.borderBottomColor = 'var(--cream-300)'}
                />
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 8, fontFamily: 'var(--font-ui)' }}>
                Leave 0 if free or negotiable
              </div>
            </div>

            {/* ── Payment (collapsible) ── */}
            <div style={{ marginBottom: 28 }}>
              <button type="button" onClick={() => setPaymentOpen(o => !o)} style={{
                display: 'flex', alignItems: 'center', gap: 8, background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
              }}>
                <span className="section-label">PAYMENT DETAILS</span>
                <svg width="12" height="12" viewBox="0 0 12 12" style={{
                  transform: paymentOpen ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform .2s', color: 'var(--ink-500)',
                }}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>

              {paymentOpen && (
                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label className="section-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>ZELLE</label>
                    <input type="text" placeholder="Phone or email" value={zelle}
                      onChange={e => setZelle(e.target.value)}
                      className="input-underline"
                    />
                  </div>
                  <div>
                    <label className="section-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>VENMO</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-500)' }}>@</span>
                      <input type="text" placeholder="username" value={venmo}
                        onChange={e => setVenmo(e.target.value)}
                        className="input-underline"
                        style={{ paddingLeft: 16 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Availability ── */}
            <div style={{ marginBottom: 28, paddingTop: 28, borderTop: '1px solid var(--cream-200)' }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>AVAILABILITY</label>
              <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 16, fontFamily: 'var(--font-ui)' }}>
                Toggle days and set time blocks. You can always add more later.
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
            </div>

            {/* ── Error ── */}
            {error && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: 10, padding: '10px 16px',
                fontSize: 13, color: 'var(--danger)', marginBottom: 20,
                fontFamily: 'var(--font-ui)',
              }}>
                {error}
              </div>
            )}

            {/* ── Submit ── */}
            <button type="submit" disabled={loading || !category} style={{
              width: '100%', height: 56,
              background: loading || !category ? 'var(--cream-300)' : 'var(--blue-600)',
              color: loading || !category ? 'var(--ink-500)' : '#fff',
              border: 'none', borderRadius: 14,
              fontSize: 18, fontWeight: 500,
              cursor: loading || !category ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
              transition: 'background .2s, color .2s',
            }}
              onMouseEnter={e => { if (!loading && category) { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={e => { if (!loading && category) { e.currentTarget.style.background = 'var(--blue-600)'; e.currentTarget.style.color = '#fff'; } }}
            >
              {loading ? 'Publishing...' : 'Post listing →'}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div className="create-listing-preview" style={{ position: 'relative' }}>
          <div className="section-label" style={{ marginBottom: 14 }}>PREVIEW</div>
          <LivePreview
            category={category}
            customCategory={customCategory}
            subcategory={subcategory}
            bio={bio}
            price={price}
            listingImage={listingImage}
            sessionType={sessionType}
            campus={campus}
          />
        </div>
      </div>

      {/* ── Responsive: hide preview on mobile ── */}
      <style>{`
        @media (max-width: 860px) {
          .create-listing-preview { display: none; }
          div[style*="grid-template-columns: 1fr 380px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
