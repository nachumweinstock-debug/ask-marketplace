import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProviderCard from '../components/ProviderCard';

const BASE_FILTERS = [
  { id: 'all',          label: 'All'           },
  { id: 'tutor',        label: 'Tutors'        },
  { id: 'fitness',      label: 'Fitness'       },
  { id: 'barber',       label: 'Barbers'       },
  { id: 'hebrew tutor', label: 'Language'       },
  { id: 'Torah Studies',label: 'Torah Studies' },
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
    <div className="page" style={{ paddingTop: 24 }}>

      {/* ── Header row ── */}
      <div className="browse-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
            fontSize: 'clamp(22px, 4vw, 38px)', fontWeight: 700,
            color: 'var(--text)', lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            Campus marketplace
          </h1>
          {!loading && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3, fontFamily: 'var(--font-ui)' }}>
              {providers.length} listing{providers.length !== 1 ? 's' : ''} · {grouped.length} student{grouped.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 10, padding: 3, gap: 2 }}>
          {[
            { id: 'rating', label: 'Top rated' },
            { id: 'newest', label: 'Newest' },
            { id: 'price_asc', label: 'Price ↑' },
          ].map(s => (
            <button key={s.id} onClick={() => handleSort(s.id)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: 'none',
              background: sort === s.id ? '#fff' : 'transparent',
              color: sort === s.id ? 'var(--text)' : 'var(--muted)',
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              boxShadow: sort === s.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
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
          border: '1.5px solid var(--gray-200)',
          borderRadius: 14, height: 52, overflow: 'hidden',
          maxWidth: 600,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ padding: '0 0 0 16px', display: 'flex', alignItems: 'center', color: 'var(--muted)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search tutors, barbers, fitness..."
            value={search}
            onChange={e => handleSearchInput(e.target.value)}
            style={{
              flex: 1, border: 'none', padding: '0 14px', height: '100%',
              fontSize: 14, outline: 'none', background: 'transparent',
              color: 'var(--text)', fontFamily: 'var(--font-ui)',
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
              padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: active ? 700 : 500,
              border: `1.5px solid ${active ? 'var(--text)' : 'var(--gray-200)'}`,
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

      {/* ── Category filters ── */}
      <div style={{ marginBottom: subcats.length > 0 ? 12 : 28, overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {allFilters.map(({ id, label }) => {
            const active = category === id;
            return (
              <button key={id} onClick={() => handleCategory(id)} style={{
                padding: '8px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${active ? 'var(--text)' : 'var(--gray-200)'}`,
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
                padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: active ? 700 : 500,
                border: `1.5px solid ${active ? 'var(--text)' : 'var(--gray-200)'}`,
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
            <div key={i} style={{
              background: '#fff', borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              border: '1px solid var(--gray-100)',
            }}>
              <div style={{ height: 200, background: 'linear-gradient(90deg, #f5f5f5 25%, #eee 50%, #f5f5f5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              <div style={{ padding: 16 }}>
                <div style={{ width: '35%', height: 10, background: '#f0f0f0', borderRadius: 6, marginBottom: 10 }} />
                <div style={{ width: '75%', height: 18, background: '#f0f0f0', borderRadius: 8, marginBottom: 8 }} />
                <div style={{ width: '100%', height: 12, background: '#f0f0f0', borderRadius: 6, marginBottom: 6 }} />
                <div style={{ width: '60%', height: 12, background: '#f0f0f0', borderRadius: 6, marginBottom: 14 }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f0f0f0' }} />
                  <div style={{ width: 80, height: 12, background: '#f0f0f0', borderRadius: 6 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Nothing here yet
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>
            Try a different search or category
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
