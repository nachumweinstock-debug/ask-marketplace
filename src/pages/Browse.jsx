import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProviderCard from '../components/ProviderCard';

const BASE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'tutor', label: 'Tutors' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'barber', label: 'Barbers' },
  { id: 'hebrew tutor', label: 'Hebrew' },
];

const SUBCATEGORY_PARENT = new Set(['tutor', 'fitness']);

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
  const [customCats, setCustomCats] = useState([]);
  const [subcats, setSubcats] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get('/providers/categories')
      .then(({ data }) => setCustomCats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSubcategory('all');
    if (!SUBCATEGORY_PARENT.has(category)) { setSubcats([]); return; }
    api.get('/providers/subcategories', { params: { category } })
      .then(({ data }) => setSubcats(data))
      .catch(() => setSubcats([]));
  }, [category]);

  useEffect(() => { fetchProviders(); }, [category, subcategory, sort, sessionType]);

  // Search-on-type with debounce
  function handleSearchInput(val) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProviders(val), 200);
  }

  async function fetchProviders(searchVal) {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (subcategory !== 'all') params.subcategory = subcategory;
      if (sessionType !== 'all') params.session_type = sessionType;
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

  function handleSearch(e) {
    e.preventDefault();
    fetchProviders(search);
  }

  function handleCategory(cat) {
    setCategory(cat);
    setSubcategory('all');
    const p = { ...(search ? { search } : {}), sort };
    if (cat !== 'all') p.category = cat;
    if (sessionType !== 'all') p.session_type = sessionType;
    setSearchParams(p);
  }

  function handleSubcategory(sub) {
    setSubcategory(sub);
    const p = { ...(search ? { search } : {}), sort };
    if (category !== 'all') p.category = category;
    if (sub !== 'all') p.subcategory = sub;
    if (sessionType !== 'all') p.session_type = sessionType;
    setSearchParams(p);
  }

  function handleSessionType(st) {
    setSessionType(st);
    const p = { ...(search ? { search } : {}), sort };
    if (category !== 'all') p.category = category;
    if (st !== 'all') p.session_type = st;
    setSearchParams(p);
  }

  function handleSort(s) {
    setSort(s);
    const p = { ...(search ? { search } : {}) };
    if (category !== 'all') p.category = category;
    if (sessionType !== 'all') p.session_type = sessionType;
    if (s !== 'rating') p.sort = s;
    setSearchParams(p);
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

  const allFilters = [...BASE_FILTERS, ...customCats.map(c => ({ id: c, label: c }))];

  return (
    <div className="page" style={{ paddingTop: 56 }}>

      {/* ── Hero typography ── */}
      <div style={{ marginBottom: 48 }} className="fade-up">
        <h1 style={{
          fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
          fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 600,
          color: 'var(--ink-900)', lineHeight: 1.05,
          letterSpacing: '-0.02em', marginBottom: 12,
        }}>
          What are you looking for?
        </h1>
        <p style={{
          fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 400,
          color: 'var(--ink-500)',
        }}>
          {grouped.length} student{grouped.length !== 1 ? 's' : ''}. {providers.length} service{providers.length !== 1 ? 's' : ''}. Campus, now.
        </p>
      </div>

      {/* ── Search + filter bar ── */}
      <div style={{ marginBottom: 28 }} className="fade-up-delay">
        <form onSubmit={handleSearch} style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--cream-50)', border: '1px solid var(--cream-300)',
          borderRadius: 12, height: 56, overflow: 'hidden',
          maxWidth: 680,
        }}>
          {/* Search icon */}
          <div style={{ padding: '0 0 0 18px', display: 'flex', alignItems: 'center', color: 'var(--ink-500)', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Try 'excel tutor' or 'barber near campus'"
            value={search}
            onChange={e => handleSearchInput(e.target.value)}
            style={{
              flex: 1, border: 'none', padding: '0 16px', height: '100%',
              fontSize: 14, outline: 'none', background: 'transparent',
              color: 'var(--ink-900)', fontFamily: 'var(--font-ui)',
            }}
          />
          {/* Vertical divider */}
          <div style={{ width: 1, height: 28, background: 'var(--cream-300)', flexShrink: 0 }} />
          {/* Format filter inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', flexShrink: 0 }}>
            {[
              { id: 'all', label: 'Any' },
              { id: 'in-person', label: 'In-Person' },
              { id: 'zoom', label: 'Zoom' },
            ].map(({ id, label }) => {
              const active = sessionType === id;
              return (
                <button key={id} type="button" onClick={() => handleSessionType(id)} style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  border: 'none',
                  background: active ? 'var(--blue-600)' : 'transparent',
                  color: active ? '#fff' : 'var(--ink-500)',
                  cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-ui)',
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        </form>
      </div>

      {/* ── Category pills + sort ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: subcats.length > 0 ? 14 : 32, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {allFilters.map(({ id, label }) => {
            const active = category === id;
            return (
              <button key={id} onClick={() => handleCategory(id)} style={{
                padding: '7px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                border: `1px solid ${active ? 'var(--blue-600)' : 'var(--cream-200)'}`,
                background: active ? 'var(--blue-600)' : 'var(--cream-50)',
                color: active ? '#fff' : 'var(--ink-500)',
                cursor: 'pointer', transition: 'all .15s',
                fontFamily: 'var(--font-ui)',
              }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Sort — editorial text buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { id: 'rating', label: 'Top Rated' },
            { id: 'newest', label: 'Newest' },
            { id: 'price_asc', label: 'Price ↑' },
          ].map(s => (
            <button key={s.id} onClick={() => handleSort(s.id)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: 'none',
              background: sort === s.id ? 'var(--cream-100)' : 'transparent',
              color: sort === s.id ? 'var(--ink-900)' : 'var(--ink-500)',
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              transition: 'all .15s',
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Subcategory pills ── */}
      {subcats.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' }}>
          <span className="section-label" style={{ marginRight: 4 }}>
            {category === 'tutor' ? 'Subject' : 'Activity'}
          </span>
          {[{ id: 'all', label: 'All' }, ...subcats.map(s => ({ id: s, label: s }))].map(({ id, label }) => {
            const active = subcategory === id;
            return (
              <button key={id} onClick={() => handleSubcategory(id)} style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                border: `1px solid ${active ? 'var(--blue-600)' : 'var(--cream-200)'}`,
                background: active ? 'var(--blue-600)' : 'var(--cream-50)',
                color: active ? '#fff' : 'var(--ink-500)',
                cursor: 'pointer', transition: 'all .12s', fontFamily: 'var(--font-ui)',
              }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Results ── */}
      {loading ? (
        <div className="provider-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              background: 'var(--cream-50)', border: '1px solid var(--cream-200)',
              borderRadius: 16, padding: 24, height: 220,
            }}>
              <div style={{ width: '30%', height: 11, background: 'var(--cream-200)', borderRadius: 6, marginBottom: 14 }} />
              <div style={{ width: '70%', height: 22, background: 'var(--cream-200)', borderRadius: 8, marginBottom: 12 }} />
              <div style={{ width: '100%', height: 13, background: 'var(--cream-200)', borderRadius: 6, marginBottom: 8 }} />
              <div style={{ width: '60%', height: 13, background: 'var(--cream-200)', borderRadius: 6, marginBottom: 24 }} />
              <div style={{ height: 1, background: 'var(--cream-200)', marginBottom: 18 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--cream-200)' }} />
                  <div style={{ width: 60, height: 12, background: 'var(--cream-200)', borderRadius: 6 }} />
                </div>
                <div style={{ width: 40, height: 18, background: 'var(--cream-200)', borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
            fontSize: 28, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 10,
          }}>
            Nothing here yet.
          </div>
          <div style={{ fontSize: 15, color: 'var(--ink-500)', fontFamily: 'var(--font-ui)' }}>
            Try a different search or category.
          </div>
        </div>
      ) : (
        <div className="provider-grid">
          {grouped.map(p => (
            <ProviderCard
              key={p.user_id}
              provider={p}
              isOwn={!!user && user.id === p.user_id}
              onDelete={user && user.id === p.user_id ? () => handleDeleteOwn(p.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
