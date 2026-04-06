import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Scissors, Star, Dumbbell, Sparkles, MoreHorizontal } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { id: 'tutor',        label: 'Tutor',         icon: BookOpen,      color: 'border-violet-300 bg-violet-50',  active: 'border-violet-600 bg-violet-100', icon: 'text-violet-600' },
  { id: 'barber',       label: 'Barber',         icon: Scissors,      color: 'border-orange-300 bg-orange-50',  active: 'border-orange-600 bg-orange-100', icon: 'text-orange-600' },
  { id: 'hebrew tutor', label: 'Hebrew Tutor',   icon: Star,          color: 'border-blue-300 bg-blue-50',      active: 'border-blue-600 bg-blue-100',     icon: 'text-blue-600' },
  { id: 'tennis',       label: 'Tennis',         icon: Dumbbell,      color: 'border-green-300 bg-green-50',    active: 'border-green-600 bg-green-100',   icon: 'text-green-600' },
  { id: 'other',        label: 'Something else', icon: MoreHorizontal,color: 'border-slate-300 bg-slate-50',   active: 'border-slate-600 bg-slate-100',   icon: 'text-slate-600' },
];

export default function CreateListing() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [price, setPrice] = useState('');
  const [zelle, setZelle] = useState('');
  const [venmo, setVenmo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category) { setError('Pick a category first'); return; }
    setError('');
    setLoading(true);
    try {
      // Become a provider first (idempotent — safe to call if already one)
      const becomeRes = await api.post('/providers/become');
      login(becomeRes.data.token, becomeRes.data.user);

      // Save the listing details
      await api.put('/providers/me', {
        category,
        bio,
        price_per_session: price || 0,
        zelle,
        venmo,
      });

      navigate('/dashboard/provider?tab=availability&new=1');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={20} className="text-amber-500" />
          <span className="text-sm font-semibold text-amber-600 uppercase tracking-wide">New Listing</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">What do you offer?</h1>
        <p className="text-slate-500 mt-1">Takes 30 seconds. You can always edit later.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">

        {/* Category */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-3 block">Pick a category</label>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ id, label, icon: Icon, color, active }) => {
              const isActive = category === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${isActive ? active : color} hover:scale-[1.02]`}
                >
                  <Icon size={20} className={isActive ? 'text-inherit' : 'text-slate-500'} />
                  <span className={`font-semibold text-sm ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
            Describe what you offer
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            placeholder={
              category === 'tutor' ? 'e.g. I tutor Calc 1 & 2, Chem 101. 3 years experience, patient and clear.' :
              category === 'barber' ? 'e.g. Fades, lineups, beard trims. Clean cuts right on campus.' :
              category === 'hebrew tutor' ? 'e.g. I can help with Rashi, Gemara, and conversational Hebrew.' :
              category === 'tennis' ? 'e.g. USTA rated player, great with beginners and intermediates.' :
              'Tell students what you can help with...'
            }
            className="w-full border border-amber-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Price per session</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full border border-amber-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Leave blank or 0 if free / negotiable</p>
        </div>

        {/* Payment */}
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-3 block">How do students pay you?</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Zelle (phone or email)</label>
              <input
                type="text"
                placeholder="646-555-1234"
                value={zelle}
                onChange={e => setZelle(e.target.value)}
                className="w-full border border-amber-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Venmo username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                <input
                  type="text"
                  placeholder="your-venmo"
                  value={venmo}
                  onChange={e => setVenmo(e.target.value)}
                  className="w-full border border-amber-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading || !category}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors text-sm"
        >
          {loading ? 'Publishing...' : 'Publish Listing →'}
        </button>

        <p className="text-center text-xs text-slate-400">
          Next you&apos;ll add your availability so students can book you.
        </p>
      </form>
    </div>
  );
}
