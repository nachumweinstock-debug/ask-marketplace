import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Scissors, Star, Dumbbell, MoreHorizontal } from 'lucide-react';

const CATEGORIES = [
  { id: 'tutor', label: 'Tutors', icon: BookOpen, color: 'bg-violet-50 border-violet-200 hover:bg-violet-100', iconColor: 'text-violet-600', desc: 'Ace your classes' },
  { id: 'barber', label: 'Barbers', icon: Scissors, color: 'bg-orange-50 border-orange-200 hover:bg-orange-100', iconColor: 'text-orange-600', desc: 'Fresh cuts on campus' },
  { id: 'hebrew tutor', label: 'Hebrew Tutors', icon: Star, color: 'bg-blue-50 border-blue-200 hover:bg-blue-100', iconColor: 'text-blue-600', desc: 'Strengthen your Hebrew' },
  { id: 'tennis', label: 'Tennis', icon: Dumbbell, color: 'bg-green-50 border-green-200 hover:bg-green-100', iconColor: 'text-green-600', desc: 'Hit the courts' },
  { id: 'other', label: 'More', icon: MoreHorizontal, color: 'bg-slate-50 border-slate-200 hover:bg-slate-100', iconColor: 'text-slate-600', desc: 'Other services' },
];

export default function Home() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) navigate(`/browse?search=${encodeURIComponent(search.trim())}`);
    else navigate('/browse');
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm mb-6 font-medium">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Yeshiva University Students Only
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
            Find services on campus,<br />
            <span className="text-blue-200">built for YU.</span>
          </h1>
          <p className="text-blue-200 text-lg sm:text-xl mb-10 max-w-2xl mx-auto">
            Book tutors, barbers, Hebrew coaches, and more — all from fellow YU students.
          </p>
          <form onSubmit={handleSearch} className="max-w-xl mx-auto">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search for tutors, barbers, tennis..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-slate-900 bg-white shadow-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Browse by Category</h2>
        <p className="text-slate-500 text-center mb-10">Find exactly what you need</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map(({ id, label, icon: Icon, color, iconColor, desc }) => (
            <button
              key={id}
              onClick={() => navigate(`/browse?category=${id}`)}
              className={`${color} border-2 rounded-2xl p-5 text-left transition-all duration-200 hover:scale-105 hover:shadow-md group`}
            >
              <div className={`${iconColor} mb-3`}>
                <Icon size={28} />
              </div>
              <div className="font-semibold text-slate-900 text-sm">{label}</div>
              <div className="text-slate-500 text-xs mt-1">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-amber-100" style={{ background: '#fdf5e8' }}>
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center">How ASK Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Find a Provider', desc: 'Search or browse students offering services on campus.' },
              { step: '2', title: 'Pick a Time', desc: 'Choose from available slots that fit your schedule.' },
              { step: '3', title: 'Pay & Connect', desc: 'Pay via Zelle or Venmo and show up. Simple as that.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-amber-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-slate-400 text-sm">
          ASK · Yeshiva University Student Marketplace · For students, by students
        </div>
      </footer>
    </div>
  );
}
