import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProviderCard from '../components/ProviderCard';
import { trackEvent } from '../lib/analytics';
import FAQAccordion from '../components/FAQAccordion';
import { TutorCardSkeleton } from '../components/Skeletons';
import { hasSuggestion, suggestText } from '../lib/textSuggestions';

const EDIT_CATEGORIES = [
  { id: 'tutor',     label: 'Instruction'  },
  { id: 'barber',    label: 'Barber'    },
  { id: 'fitness',   label: 'Fitness'   },
  { id: 'languages', label: 'Languages' },
  { id: 'music',     label: 'Music'     },
  { id: 'torah',     label: 'Torah'     },
  { id: 'other',     label: 'Other'     },
];
const EDIT_SUBCATS = {
  tutor:     ['Math', 'Chemistry', 'Biology', 'Physics', 'Excel', 'Coding', 'English', 'History', 'Economics', 'SAT/ACT', 'Calculus', 'Statistics'],
  fitness:   ['Tennis', 'Golf', 'Basketball', 'Soccer', 'Baseball', 'Swimming', 'Squash', 'Yoga', 'Weightlifting', 'Running', 'Boxing', 'Volleyball'],
  languages: ['Hebrew', 'Ivrit', 'Spanish', 'French', 'Yiddish', 'Arabic', 'Russian', 'Mandarin', 'Italian', 'German'],
  music:     ['Guitar', 'Piano', 'Violin', 'Drums', 'Vocals', 'Bass', 'Ukulele', 'Flute', 'Music Theory', 'Saxophone'],
  torah:     ['Gemara', 'Halacha', 'Chumash', 'Mishna', 'Tefilla', 'Parsha', 'Tanach', 'Jewish History', 'Mussar', 'Chassidus'],
};
const CUSTOM_CAT_MAP = { torah: 'Torah Studies', languages: 'Languages', music: 'Music' };

const BASE_FILTERS = [
  { id: 'all',          label: 'All'           },
  { id: 'tutor',        label: 'Instructors'   },
  { id: 'fitness',      label: 'Fitness'       },
  { id: 'barber',       label: 'Barbers'       },
  { id: 'languages',    label: 'Languages'     },
  { id: 'music',        label: 'Music'         },
  { id: 'Torah Studies',label: 'Torah Studies' },
];

const SUBCATEGORY_PARENT = new Set(['tutor', 'fitness', 'languages', 'music']);

function TextSuggestion({ value, onApply }) {
  if (!value || !hasSuggestion(value)) return null;
  const suggestion = suggestText(value);
  return (
    <button type="button" onClick={() => onApply(suggestion)} style={{
      marginTop: 7,
      border: '1px solid #BFDBFE',
      background: '#EFF6FF',
      color: '#1D4ED8',
      borderRadius: 999,
      padding: '5px 10px',
      fontSize: 11.5,
      fontWeight: 800,
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
    }}>
      Apply spelling suggestion: {suggestion.slice(0, 70)}{suggestion.length > 70 ? '...' : ''}
    </button>
  );
}

export default function Browse() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [subcategory, setSubcategory] = useState(searchParams.get('subcategory') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'rating');
  const [sessionType, setSessionType] = useState(searchParams.get('session_type') || 'all');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [minRating, setMinRating] = useState(searchParams.get('min_rating') || '');
  const [availability, setAvailability] = useState(searchParams.get('availability') || 'all');
  const [savedIds, setSavedIds] = useState(new Set());
  const [customCats, setCustomCats] = useState([]);
  const [subcats, setSubcats] = useState([]);
  const debounceRef = useRef(null);
  const [editModal, setEditModal] = useState(null); // { profileId, isAdminEdit, form }
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    api.get('/providers/categories')
      .then(({ data }) => setCustomCats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return; }
    api.get('/saved-tutors/ids')
      .then(({ data }) => setSavedIds(new Set(data)))
      .catch(() => setSavedIds(new Set()));
  }, [user?.id]);

  useEffect(() => {
    setSubcategory('all');
    if (!SUBCATEGORY_PARENT.has(category)) { setSubcats([]); return; }
    api.get('/providers/subcategories', { params: { category } })
      .then(({ data }) => setSubcats(data))
      .catch(() => setSubcats([]));
  }, [category]);

  useEffect(() => { fetchProviders(); }, [category, subcategory, sort, sessionType, minPrice, maxPrice, minRating, availability]);

  function syncParams(next = {}) {
    const state = {
      search,
      category,
      subcategory,
      sort,
      session_type: sessionType,
      min_price: minPrice,
      max_price: maxPrice,
      min_rating: minRating,
      availability,
      ...next,
    };
    const p = {};
    for (const [key, value] of Object.entries(state)) {
      if (!value || value === 'all') continue;
      if (key === 'sort' && value === 'rating') continue;
      p[key] = value;
    }
    setSearchParams(p);
  }

  // Search-on-type with debounce
  function handleSearchInput(val) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim().length >= 2) {
        trackEvent('search_started', { query_length: val.trim().length, category, subcategory, session_type: sessionType });
      }
      fetchProviders(val);
    }, 200);
  }

  async function fetchProviders(searchVal) {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (subcategory !== 'all') params.subcategory = subcategory;
      if (sessionType !== 'all') params.session_type = sessionType;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (minRating) params.min_rating = minRating;
      if (availability !== 'all') params.availability = availability;
      const q = searchVal !== undefined ? searchVal : search;
      if (q) params.search = q;
      params.sort = sort;
      const { data } = await api.get('/providers', { params });
      setProviders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOwn(providerId) {
    if (!confirm('Delete your listing? This removes all your availability, bookings, and reviews. Cannot be undone.')) return;
    try {
      await api.delete(`/providers/${providerId}`);
      await refreshUser();
      setProviders(ps => ps.filter(p => p.id !== providerId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete listing');
    }
  }

  async function openEdit(profileId, isAdminEdit = false) {
    try {
      const { data } = await api.get(`/providers/${profileId}`);
      const CUSTOM_TO_CAT = { 'Torah Studies': 'torah', 'Languages': 'languages', 'Music': 'music' };
      const cat = CUSTOM_TO_CAT[data.custom_category] || data.category || 'other';
      setEditError('');
      setEditModal({
        profileId,
        isAdminEdit,
        form: {
          category: cat,
          custom_category: data.custom_category || '',
          subcategory: data.subcategory || '',
          bio: data.bio || '',
          price_per_session: data.price_per_session ?? '',
          zelle: data.zelle || '',
          venmo: data.venmo || '',
          session_type: data.session_type || 'in-person',
        },
      });
    } catch { alert('Failed to load listing'); }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditError(''); setEditLoading(true);
    const { profileId, isAdminEdit, form } = editModal;
    const isCustom = !!CUSTOM_CAT_MAP[form.category];
    const body = {
      category: isCustom ? 'other' : form.category,
      custom_category: isCustom ? CUSTOM_CAT_MAP[form.category] : (form.category === 'other' ? form.custom_category : ''),
      subcategory: ['tutor', 'fitness', 'torah', 'languages', 'music'].includes(form.category) ? form.subcategory : '',
      bio: form.bio,
      price_per_session: form.price_per_session === '' ? 0 : Number(form.price_per_session),
      zelle: form.zelle,
      venmo: form.venmo,
      session_type: form.session_type,
    };
    try {
      const { data } = await api[isAdminEdit ? 'put' : 'put'](
        isAdminEdit ? `/admin/listings/${profileId}` : `/providers/${profileId}`,
        body
      );
      setProviders(ps => ps.map(p => p.id === profileId ? { ...p, ...data } : p));
      setEditModal(null);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Save failed');
    } finally {
      setEditLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) {
      trackEvent('search_started', { query_length: search.trim().length, category, subcategory, session_type: sessionType, submitted: true });
    }
    syncParams({ search });
    fetchProviders(search);
  }

  function handleCategory(cat) {
    setCategory(cat);
    setSubcategory('all');
    syncParams({ category: cat, subcategory: 'all' });
  }

  function handleSubcategory(sub) {
    setSubcategory(sub);
    syncParams({ subcategory: sub });
  }

  function handleSessionType(st) {
    setSessionType(st);
    syncParams({ session_type: st });
  }

  function handleSort(s) {
    setSort(s);
    syncParams({ sort: s });
  }

  function handleSavedChange(id, next) {
    setSavedIds(prev => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  // Group listings by user
  const grouped = [];
  const seen = new Set();
  for (const p of providers) {
    if (!seen.has(p.user_id)) {
      seen.add(p.user_id);
      grouped.push({ ...p, allListings: providers.filter(q => q.user_id === p.user_id) });
    }
  }

  const baseIds = new Set(BASE_FILTERS.map(f => f.id.toLowerCase()));
  const allFilters = [...BASE_FILTERS, ...customCats.filter(c => !baseIds.has(c.toLowerCase())).map(c => ({ id: c, label: c }))];

  return (
    <div className="page" style={{ paddingTop: 26 }}>

      {/* ── Header row ── */}
      <div className="browse-header" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 18, flexWrap: 'wrap', gap: 14,
        borderBottom: '1px solid var(--border)', paddingBottom: 18,
      }}>
        <div>
          <div className="section-label" style={{ marginBottom: 7 }}>Marketplace</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
            fontSize: 'clamp(36px, 7vw, 70px)', fontWeight: 760,
            color: 'var(--text)', lineHeight: 1.05,
            letterSpacing: 0,
          }}>
            Find the right person.
          </h1>
          {!loading && (
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 7, fontFamily: 'var(--font-ui)', fontWeight: 650 }}>
              {providers.length} listing{providers.length !== 1 ? 's' : ''} · {grouped.length} instructor{grouped.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
          {[
            { id: 'rating', label: 'Top rated' },
            { id: 'newest', label: 'Newest' },
            { id: 'price_asc', label: 'Price ↑' },
          ].map(s => (
            <button key={s.id} onClick={() => handleSort(s.id)} style={{
              padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800,
              border: 'none',
              background: sort === s.id ? 'var(--text)' : 'transparent',
              color: sort === s.id ? '#fff' : 'var(--muted)',
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              boxShadow: 'none',
              transition: 'all .12s',
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div style={{ marginBottom: 12 }}>
        <form onSubmit={handleSearch} style={{
          display: 'flex', alignItems: 'center',
          background: '#fff',
          border: '1px solid rgba(23,19,15,0.14)',
          borderRadius: 8, height: 56, overflow: 'hidden',
          maxWidth: 720,
          boxShadow: '0 14px 38px rgba(23,19,15,0.07)',
        }}>
          <div style={{ padding: '0 0 0 16px', display: 'flex', alignItems: 'center', color: 'var(--muted)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search instructors, barbers, fitness..."
            value={search}
            onChange={e => handleSearchInput(e.target.value)}
            style={{
              flex: 1, border: 'none', padding: '0 14px', height: '100%',
              fontSize: 15, outline: 'none', background: 'transparent',
              color: 'var(--text)', fontFamily: 'var(--font-ui)',
              fontWeight: 650,
            }}
          />
        </form>
      </div>

      {/* ── Session type filter ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Any' },
          { id: 'in-person', label: 'In-person' },
          { id: 'zoom', label: 'Online' },
          { id: 'both', label: 'Both' },
        ].map(({ id, label }) => {
          const active = sessionType === id;
          return (
            <button key={id} onClick={() => handleSessionType(id)} style={{
              padding: '8px 13px', borderRadius: 8, fontSize: 13, fontWeight: active ? 800 : 700,
              border: `1px solid ${active ? 'var(--text)' : 'var(--gray-200)'}`,
              background: active ? 'var(--text)' : '#fff',
              color: active ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all .12s', fontFamily: 'var(--font-ui)',
              whiteSpace: 'nowrap',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Advanced filters ── */}
      <div className="card" style={{ padding: 14, marginBottom: 18, borderRadius: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
          <label style={filterLabel}>
            Min price
            <input type="number" min="0" placeholder="$0" value={minPrice} onChange={e => { setMinPrice(e.target.value); syncParams({ min_price: e.target.value }); }} style={filterInput} />
          </label>
          <label style={filterLabel}>
            Max price
            <input type="number" min="0" placeholder="Any" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); syncParams({ max_price: e.target.value }); }} style={filterInput} />
          </label>
          <label style={filterLabel}>
            Rating
            <select value={minRating} onChange={e => { setMinRating(e.target.value); syncParams({ min_rating: e.target.value }); }} style={filterInput}>
              <option value="">Any rating</option>
              <option value="4.5">4.5+</option>
              <option value="4">4.0+</option>
              <option value="3">3.0+</option>
            </select>
          </label>
          <label style={filterLabel}>
            Availability
            <select value={availability} onChange={e => { setAvailability(e.target.value); syncParams({ availability: e.target.value }); }} style={filterInput}>
              <option value="all">Any</option>
              <option value="open">Open slots only</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Category filters ── */}
      <div style={{ marginBottom: subcats.length > 0 ? 12 : 28, overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {allFilters.map(({ id, label }) => {
            const active = category === id;
            return (
              <button key={id} onClick={() => handleCategory(id)} style={{
                padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 800,
                border: `1px solid ${active ? 'var(--text)' : 'var(--gray-200)'}`,
                background: active ? 'var(--text)' : '#fff',
                color: active ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all .12s',
                fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
              }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Subcategory pills ── */}
      {subcats.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
          {[{ id: 'all', label: 'All' }, ...subcats.map(s => ({ id: s, label: s }))].map(({ id, label }) => {
            const active = subcategory === id;
            return (
              <button key={id} onClick={() => handleSubcategory(id)} style={{
                padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: active ? 800 : 700,
                border: `1px solid ${active ? 'var(--text)' : 'var(--gray-200)'}`,
                background: active ? 'var(--text)' : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                cursor: 'pointer', transition: 'all .1s', fontFamily: 'var(--font-ui)',
              }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 560px) {
          .browse-header { align-items: flex-start; flex-direction: column; gap: 10px; }
          .browse-header > div:last-child { align-self: flex-start; }
        }
      `}</style>

      {/* ── Results ── */}
      {loading ? (
        <div className="provider-grid">
          {[...Array(6)].map((_, i) => (
            <TutorCardSkeleton key={i} />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            No instructors found for this filter combination.
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>
            Clear a filter, widen the price range, or try another subject.
          </div>
        </div>
      ) : (
        <div className="provider-grid">
          {grouped.map(p => (
            <ProviderCard
              key={p.user_id}
              provider={p}
              isOwn={!!user && user.id === p.user_id}
              isAdmin={!!user?.is_admin}
              saved={savedIds.has(p.id)}
              onSavedChange={handleSavedChange}
              onDelete={user && user.id === p.user_id ? () => handleDeleteOwn(p.id) : undefined}
              onEdit={
                user?.is_admin
                  ? () => openEdit(p.id, true)
                  : user && user.id === p.user_id
                    ? () => openEdit(p.id, false)
                    : undefined
              }
            />
          ))}
        </div>
      )}

      <FAQAccordion
        title="Instructor search FAQ"
        schemaId="browse-faq-schema"
        faqs={[
          ['How do I find the right instructor?', 'Use subject, price, rating, format, and availability filters to narrow the marketplace, then open profiles to compare schedule and reviews.'],
          ['Can I message before booking?', 'Yes. Open an instructor profile and message them before requesting a session.'],
          ['Can I book online sessions?', 'Yes. Use the Online filter to find instructors who offer Zoom or remote sessions.'],
          ['Why do no instructors match my filters?', 'Some filters can be restrictive together. Try widening price or switching availability to any.'],
          ['Can I save instructors for later?', 'Yes. Tap the heart on a card or profile to save instructors, then open Saved from your account.'],
        ]}
      />

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
                  {EDIT_CATEGORIES.map(c => (
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
                    spellCheck="true"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                  <TextSuggestion value={editModal.form.custom_category} onApply={value => setEditModal(m => ({ ...m, form: { ...m.form, custom_category: value } }))} />
                </div>
              )}

              {EDIT_SUBCATS[editModal.form.category] && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
                    {{ tutor: 'Subject', languages: 'Language', music: 'Instrument', fitness: 'Sport', torah: 'Topic' }[editModal.form.category]}
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                    {EDIT_SUBCATS[editModal.form.category].map(s => (
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
                    spellCheck="true"
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
                  />
                  <TextSuggestion value={editModal.form.subcategory} onApply={value => setEditModal(m => ({ ...m, form: { ...m.form, subcategory: value } }))} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Description</label>
                <textarea value={editModal.form.bio}
                  onChange={e => setEditModal(m => ({ ...m, form: { ...m.form, bio: e.target.value } }))}
                  rows={4} required
                  spellCheck="true"
                  style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'var(--font-ui)', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <TextSuggestion value={editModal.form.bio} onApply={value => setEditModal(m => ({ ...m, form: { ...m.form, bio: value } }))} />
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

const filterLabel = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11,
  fontWeight: 800,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const filterInput = {
  height: 38,
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  background: '#fff',
  color: 'var(--text)',
  padding: '0 10px',
  fontSize: 13,
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  textTransform: 'none',
  letterSpacing: 0,
  fontWeight: 600,
};
