import { useState } from 'react';
import { Link } from 'react-router-dom';

const CATEGORY_LABELS = {
  tutor: 'Tutors',
  barber: 'Barbers',
  'hebrew tutor': 'Hebrew',
  tennis: 'Fitness',
  other: 'Other',
};

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProviderCard({ provider }) {
  const [hovered, setHovered] = useState(false);
  const label = CATEGORY_LABELS[provider.category] || 'Other';

  return (
    <Link
      to={`/providers/${provider.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block', textDecoration: 'none', position: 'relative',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '20px',
        boxShadow: hovered ? '0 6px 24px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow .2s, transform .2s',
      }}
    >
      {/* Avatar */}
      <div style={{ marginBottom: 14 }}>
        {provider.avatar_url ? (
          <img src={provider.avatar_url} alt={provider.name} style={{
            width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
            border: '1px solid var(--border)',
          }} />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--accent)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-ui)',
          }}>
            {initials(provider.name)}
          </div>
        )}
      </div>

      {/* Name */}
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>
        {provider.name}
      </div>

      {/* Category badge */}
      <span style={{
        display: 'inline-block', marginBottom: 10,
        background: 'var(--accent)', color: 'var(--primary)',
        fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999,
      }}>
        {label}
      </span>

      {/* Bio */}
      <p style={{
        fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55,
        marginBottom: 14, minHeight: 36,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {provider.bio || 'No description provided.'}
      </p>

      {/* Price */}
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
        {provider.price_per_session > 0 ? `$${provider.price_per_session}` : 'Free'}
        {provider.price_per_session > 0 && (
          <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>/ session</span>
        )}
      </div>

      {/* Hover CTA */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        background: 'var(--primary)', color: '#fff',
        borderRadius: 999, padding: '5px 14px',
        fontSize: 12, fontWeight: 600,
        opacity: hovered ? 1 : 0, transition: 'opacity .15s',
      }}>
        View
      </div>
    </Link>
  );
}
