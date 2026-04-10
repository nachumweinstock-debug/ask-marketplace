import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import ProviderCard from '../components/ProviderCard';

const BLUE = '#2B6CB0';

const FILTERS = [
  { id: 'all',          label: 'All' },
  { id: 'tutor',        label: 'Tutors' },
  { id: 'barber',       label: 'Barbers' },
  { id: 'hebrew tutor', label: 'Hebrew' },
  { id: 'tennis',       label: 'Tennis' },
  { id: 'other',        label: 'Other' },
];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');

  useEffect(() => { fetchProviders(); }, [category]);

  async function fetchProviders(searchVal) {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      const q = searchVal !== undefined ? searchVal : search;
      if (q) params.search = q;
      const { data } = await api.get('/providers', { params });
      setProviders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchProviders(search);
    const p = {};
    if (search) p.search = search;
    if (category !== 'all') p.category = category;
    setSearchParams(p);
  }

  function handleCategory(cat) {
    setCategory(cat);
    const p = { ...(search ? { search } : {}) };
    if (cat !== 'all') p.category = cat;
    setSearchParams(p);
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 48px' }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A2E' }}>Browse listings</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
          Services offered by YU students
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex', background: '#fff',
          borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0',
        }}>
          <input
            type="text"
            placeholder="Search by name or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', padding: '10px 14px',
              fontSize: 13, outline: 'none', background: 'transparent', color: '#1A1A2E',
            }}
          />
          <button type="submit" style={{
            background: BLUE, color: '#fff', border: 'none',
            padding: '0 16px', fontSize: 12, cursor: 'pointer', fontWeight: 500,
          }}>
            Search
          </button>
        </div>
      </form>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTERS.map(({ id, label }) => {
          const active = category === id;
          return (
            <button key={id} onClick={() => handleCategory(id)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${active ? BLUE : '#E2E8F0'}`,
              background: active ? BLUE : '#fff',
              color: active ? '#fff' : '#64748B',
              transition: 'all 0.15s',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
              padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F1F5F9', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 13, background: '#F1F5F9', borderRadius: 4, width: '50%', marginBottom: 8 }} />
                <div style={{ height: 11, background: '#F1F5F9', borderRadius: 4, width: '35%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A2E', marginBottom: 6 }}>No results</div>
          <div style={{ fontSize: 13, color: '#64748B' }}>Try a different search or category.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
            {providers.length} {providers.length === 1 ? 'listing' : 'listings'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {providers.map(p => <ProviderCard key={p.id} provider={p} />)}
          </div>
        </>
      )}

      <Link to="/create-listing" style={{
        display: 'block', marginTop: 20, padding: '12px',
        background: BLUE, color: '#fff', borderRadius: 10,
        fontSize: 14, fontWeight: 500, textAlign: 'center', textDecoration: 'none',
      }}>
        + Post a listing
      </Link>
    </div>
  );
}
