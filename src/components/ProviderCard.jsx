import { Link } from 'react-router-dom';

const BLUE = '#2B6CB0';

const CATEGORY_STYLE = {
  tutor:          { bg: '#EBF4FF', color: '#1D4ED8', label: 'Tutor',   emoji: '📚' },
  barber:         { bg: '#FDF2F8', color: '#9D174D', label: 'Barber',  emoji: '✂️' },
  'hebrew tutor': { bg: '#F0FFF4', color: '#166534', label: 'Hebrew',  emoji: '✡️' },
  tennis:         { bg: '#FFFBEB', color: '#92400E', label: 'Tennis',  emoji: '🎾' },
  other:          { bg: '#F5F3FF', color: '#5B21B6', label: 'Other',   emoji: '💼' },
};

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProviderCard({ provider }) {
  const s = CATEGORY_STYLE[provider.category] || CATEGORY_STYLE.other;

  return (
    <Link to={`/providers/${provider.id}`} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: '#fff', border: '1px solid #E2E8F0',
      borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
      textDecoration: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 2px 8px rgba(43,108,176,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {provider.avatar_url ? (
        <img src={provider.avatar_url} alt={provider.name}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: s.bg, color: s.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, fontSize: 13,
        }}>
          {initials(provider.name)}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {provider.name}
        </div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
          {provider.bio ? provider.bio.slice(0, 60) + (provider.bio.length > 60 ? '…' : '') : s.label}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: BLUE }}>
          {provider.price_per_session > 0 ? `$${provider.price_per_session}` : 'Free'}
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8' }}>
          {provider.price_per_session > 0 ? 'per session' : ''}
        </div>
        <div style={{
          display: 'inline-block', fontSize: 10, fontWeight: 600,
          padding: '2px 8px', borderRadius: 4, marginTop: 4,
          background: s.bg, color: s.color,
        }}>
          {s.label}
        </div>
      </div>
    </Link>
  );
}
