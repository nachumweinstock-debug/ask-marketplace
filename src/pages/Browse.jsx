import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import api from '../api';
import ProviderCard from '../components/ProviderCard';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'tutor', label: 'Tutors' },
  { id: 'barber', label: 'Barbers' },
  { id: 'hebrew tutor', label: 'Hebrew Tutors' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'other', label: 'Other' },
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
    const p = {};
    if (search) p.search = search;
    if (cat !== 'all') p.category = cat;
    setSearchParams(p);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Browse Providers</h1>
        <p className="text-slate-500">Discover services offered by YU students</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </form>
        <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <SlidersHorizontal size={16} className="text-slate-400 shrink-0 ml-1" />
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => handleCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                category === c.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-14 h-14 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-slate-200 rounded mb-2" />
              <div className="h-3 bg-slate-200 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No providers found</h3>
          <p className="text-slate-500">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <>
          <p className="text-slate-500 text-sm mb-4">{providers.length} provider{providers.length !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {providers.map(p => <ProviderCard key={p.id} provider={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
