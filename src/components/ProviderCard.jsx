import { Link } from 'react-router-dom';
import { Star, DollarSign } from 'lucide-react';

const CATEGORY_COLORS = {
  tutor: 'bg-violet-100 text-violet-700',
  barber: 'bg-orange-100 text-orange-700',
  'hebrew tutor': 'bg-blue-100 text-blue-700',
  tennis: 'bg-green-100 text-green-700',
  other: 'bg-slate-100 text-slate-600',
};

const CATEGORY_LABELS = {
  tutor: 'Tutor',
  barber: 'Barber',
  'hebrew tutor': 'Hebrew Tutor',
  tennis: 'Tennis',
  other: 'Other',
};

function Initials({ name }) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProviderCard({ provider }) {
  return (
    <Link
      to={`/providers/${provider.id}`}
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-200 flex flex-col gap-4 group"
    >
      <div className="flex items-start gap-3">
        {provider.avatar_url ? (
          <img
            src={provider.avatar_url}
            alt={provider.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-slate-100"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
            <Initials name={provider.name} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
            {provider.name}
          </h3>
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${CATEGORY_COLORS[provider.category] || CATEGORY_COLORS.other}`}>
            {CATEGORY_LABELS[provider.category] || provider.category}
          </span>
        </div>
      </div>

      {provider.bio && (
        <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">{provider.bio}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          <span className="text-sm font-medium text-slate-700">
            {provider.rating > 0 ? provider.rating.toFixed(1) : 'New'}
          </span>
          {provider.review_count > 0 && (
            <span className="text-slate-400 text-xs">({provider.review_count})</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 text-slate-700 font-semibold text-sm">
          <DollarSign size={14} className="text-slate-400" />
          {provider.price_per_session > 0 ? `${provider.price_per_session}/session` : 'Free'}
        </div>
      </div>
    </Link>
  );
}
