import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProviderCard from '../components/ProviderCard';

const BASE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'tutor', label: 'Tutors' },
  { id: 'barber', label: 'Barbers' },
  { id: 'hebrew tutor', label: 'Hebrew' },
  { id: 'tennis', label: 'Fitness' },
];

export default function Browse() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'rating');
  const [customCats, setCustomCats] = useState([]);

  // Fetch live custom categories once on mount
  useEffect(() => {
    api.get('/providers/categories')
      .then(({ data }) => setCustomCats(data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchProviders(); }, [category, sort]);

  async function fetchProviders(searchVal) {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'all') params.category = category;
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
      await api.delete('/providers/me');
      await refreshUser();
      setProviders(ps => ps.filter(p => p.id !== providerId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete listing');
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchProviders(search);
    const p = {};
    if (search) p.search = search;
    if (category !== 'all') p.category = category;
    if (sort !== 'rating') p.sort = sort;
    setSearchParams(p);
  }

  function handleCategory(cat) {
    setCategory(cat);
    const p = { ...(search ? { search } : {}), sort };
    if (cat !== 'all') p.category = cat;
    setSearchParams(p);
  }

  function handleSort(s) {
    setSort(s);
    const p = { ...(search ? { search } : {}) };
    if (category !== 'all') p.category = category;
    if (s !== 'rating') p.sort = s;
    setSearchParams(p);
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 64px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6,
        }}>
          Browse listings
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Services offered by students in your community.</p>
      </div>

      {/* Search + Sort row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 240 }}>
          <div style={{
            display: 'flex', background: '#fff',
            borderRadius: 999, overflow: 'hidden',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            maxWidth: 480,
          }}>
            <input
              type="text"
              placeholder="Search by name or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, border: 'none', padding: '11px 20px',
                fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)',
                fontFamily: 'var(--font-ui)',
              }}
            />
            <button type="submit" style={{
              background: 'var(--primary)', color: '#fff', border: 'none',
              padding: '0 20px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
              fontFamily: 'var(--font-ui)',
            }}>
              Search
            </button>
          </div>
        </form>

        {/* Sort pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'rating', label: 'Top Rated' },
            { id: 'newest', label: 'Newest' },
            { id: 'price_asc', label: 'Price: Low' },
          ].map(s => (
            <button key={s.id} onClick={() => handleSort(s.id)} style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
              border: `1px solid ${sort === s.id ? 'var(--primary)' : 'var(--border)'}`,
              background: sort === s.id ? 'var(--primary)' : 'var(--card)',
              color: sort === s.id ? '#fff' : 'var(--muted)',
              cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-ui)',
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pill filters — base categories + any live custom categories */}
      <div className="pill-row" style={{ marginBottom: 32 }}>
        {[...BASE_FILTERS, ...customCats.map(c => ({ id: c, label: c }))].map(({ id, label }) => {
          const active = category === id;
          return (
            <button key={id} onClick={() => handleCategory(id)} style={{
              padding: '7px 18px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              background: active ? 'var(--primary)' : 'var(--card)',
              color: active ? '#fff' : 'var(--muted)',
              cursor: 'pointer', transition: 'all .15s',
              fontFamily: 'var(--font-ui)',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading ? (
        <div className="provider-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ padding: '20px', height: 180 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F1F5F9', marginBottom: 14 }} />
              <div style={{ height: 13, background: '#F1F5F9', borderRadius: 6, width: '55%', marginBottom: 10 }} />
              <div style={{ height: 11, background: '#F1F5F9', borderRadius: 6, width: '35%', marginBottom: 8 }} />
              <div style={{ height: 11, background: '#F1F5F9', borderRadius: 6, width: '80%' }} />
            </div>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text)', marginBottom: 10 }}>
            Nothing here yet.
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Try a different search or category.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, fontWeight: 500 }}>
            {providers.length} {providers.length === 1 ? 'listing' : 'listings'}
          </div>
          <div className="provider-grid">
            {providers.map(p => (
              <ProviderCard
                key={p.id}
                provider={p}
                isOwn={!!user && user.id === p.user_id}
                onDelete={user && user.id === p.user_id ? () => handleDeleteOwn(p.id) : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
