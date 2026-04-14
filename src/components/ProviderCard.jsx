import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryPill, { SessionTypePill } from './CategoryPill';
import { mediaUrl } from '../lib/media';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProviderCard({ provider, isOwn, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/providers/${provider.id}`)}
      style={{
        position: 'relative', cursor: 'pointer',
        background: isOwn ? '#F0FDF4' : 'var(--card)',
        border: `1px solid ${isOwn ? '#86EFAC' : 'var(--border)'}`,
        borderRadius: 12, overflow: 'hidden',
        boxShadow: hovered ? '0 6px 24px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow .2s, transform .2s',
      }}
    >
      {/* Cover image */}
      {provider.listing_image ? (
        <div style={{ height: 130, overflow: 'hidden', background: 'var(--bg)' }}>
          <img src={provider.listing_image} alt={provider.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ) : (
        <div style={{ height: 6, background: isOwn ? '#86EFAC' : 'var(--accent)' }} />
      )}

      <div style={{ padding: '16px 20px 20px' }}>
        {/* "Your listing" badge */}
        {isOwn && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.4px',
            color: '#166534', background: '#DCFCE7', borderRadius: 999,
            padding: '2px 8px', marginBottom: 10, textTransform: 'uppercase',
          }}>
            Your listing
          </div>
        )}

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {mediaUrl(provider.avatar_url) ? (
            <img src={mediaUrl(provider.avatar_url)} alt={provider.name} style={{
              width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
              border: '1px solid var(--border)', flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-ui)',
            }}>
              {initials(provider.name)}
            </div>
          )}
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', lineHeight: 1.3, minWidth: 0 }}>
            {provider.name}
          </div>
        </div>

        {/* Category + session type pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          <CategoryPill category={provider.category} customCategory={provider.custom_category} subcategory={provider.subcategory} />
          <SessionTypePill sessionType={provider.session_type} />
        </div>

        {/* Rating + session count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          {provider.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#F59E0B', fontSize: 12 }}>★</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{provider.rating.toFixed(1)}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>({provider.review_count})</span>
            </div>
          )}
          {provider.completed_sessions > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                {provider.completed_sessions} session{provider.completed_sessions !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

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
      </div>

      {/* Hover CTA */}
      {!isOwn && (
        <div style={{
          position: 'absolute', bottom: 16, right: 16,
          background: 'var(--primary)', color: '#fff',
          borderRadius: 999, padding: '5px 14px',
          fontSize: 12, fontWeight: 600,
          opacity: hovered ? 1 : 0, transition: 'opacity .15s',
          pointerEvents: 'none',
        }}>
          View
        </div>
      )}

      {/* Three-dot menu — own listing only */}
      {isOwn && (
        <div ref={menuRef} style={{ position: 'absolute', top: provider.listing_image ? 142 : 16, right: 12 }}
          onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
            style={{
              background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border)',
              borderRadius: 999, width: 28, height: 28, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: 'var(--muted)', fontWeight: 700, lineHeight: 1,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            ···
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 34,
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              minWidth: 160, zIndex: 50, overflow: 'hidden',
            }}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); navigate('/dashboard/provider?tab=availability'); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px', background: 'none', border: 'none',
                  fontSize: 13, color: 'var(--text)', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Edit listing
              </button>
              <button
                onClick={e => {
                  e.stopPropagation(); setMenuOpen(false);
                  if (onDelete) onDelete();
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px', background: 'none', border: 'none',
                  fontSize: 13, color: '#DC2626', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  borderTop: '1px solid var(--border)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Delete listing
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
