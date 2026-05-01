import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mediaUrl } from '../lib/media';
import { providerUrl } from '../lib/providerUrl';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function listingLabel(l) {
  return l.title || l.subcategory || l.custom_category ||
    { tutor: 'Tutoring', barber: 'Haircuts', 'hebrew tutor': 'Hebrew Tutoring',
      fitness: 'Fitness', tennis: 'Fitness' }[l.category] || l.category;
}

function categoryLabel(l) {
  if (l.custom_category) return l.custom_category;
  const map = { tutor: 'Tutoring', barber: 'Barber', 'hebrew tutor': 'Hebrew', fitness: 'Fitness', tennis: 'Fitness', other: 'Service' };
  return map[l.category] || 'Service';
}

// Warm gradients for cards without photos
const CAT_GRADIENT = {
  tutor:        'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
  'hebrew tutor': 'linear-gradient(135deg, #A5B4FC 0%, #4F46E5 100%)',
  fitness:      'linear-gradient(135deg, #6EE7B7 0%, #059669 100%)',
  tennis:       'linear-gradient(135deg, #6EE7B7 0%, #059669 100%)',
  barber:       'linear-gradient(135deg, #FCA5A5 0%, #DC2626 100%)',
  other:        'linear-gradient(135deg, #E2E8F0 0%, #94A3B8 100%)',
};

function cardGradient(category, customCategory) {
  if (customCategory) {
    // Hash the name for a consistent warm color
    let hash = 0;
    for (const c of customCategory) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
    const hue = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${hue},70%,75%) 0%, hsl(${(hue+30)%360},65%,55%) 100%)`;
  }
  return CAT_GRADIENT[category] || CAT_GRADIENT.other;
}

function formatMode(sessionType) {
  if (!sessionType || sessionType === 'in-person') return 'In-person';
  if (sessionType === 'zoom') return 'Online';
  return 'Both';
}

export default function ProviderCard({ provider, isOwn, onDelete, onEdit, isAdmin }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const allListings = provider.allListings || [provider];
  const hasPhoto = !!provider.listing_image;

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const gradient = cardGradient(provider.category, provider.custom_category);
  const mode = formatMode(provider.session_type);
  const label = listingLabel(provider);
  const catLabel = categoryLabel(provider);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(providerUrl(provider.name, provider.id))}
      style={{
        position: 'relative', cursor: 'pointer',
        background: '#fff',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: hovered ? '0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10)' : '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        border: isOwn ? '2px solid #86EFAC' : '1px solid #f0f0f0',
      }}
    >
      {/* ── Visual header ──────────────────────────────────────── */}
      <div className="card-img-area" style={{ position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {hasPhoto ? (
          <img
            src={provider.listing_image} alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
              fontSize: 'clamp(18px, 4.8vw, 36px)', fontWeight: 700, color: 'rgba(255,255,255,0.9)',
              textAlign: 'center', padding: '0 12px', lineHeight: 1.1,
              textShadow: '0 2px 8px rgba(0,0,0,0.15)',
              maxWidth: '100%', wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {label}
            </span>
          </div>
        )}

        {/* Gradient overlay for readability */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 72,
          background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)',
        }} />

        {/* Mode pill — bottom left */}
        <div className="card-mode-pill" style={{
          position: 'absolute', bottom: 10, left: 10,
          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
          color: '#fff', letterSpacing: '0.04em',
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          borderRadius: 99, padding: '3px 9px',
          maxWidth: 'calc(100% - 70px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {mode}
        </div>

        {/* Price — bottom right */}
        <div className="card-price" style={{
          position: 'absolute', bottom: 8, right: 10,
          fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
          fontSize: 20, fontWeight: 700,
          color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.3)',
        }}>
          {provider.price_per_session > 0 ? `$${provider.price_per_session}` : 'Free'}
        </div>

        {isOwn && <OwnMenu menuRef={menuRef} menuOpen={menuOpen} setMenuOpen={setMenuOpen} navigate={navigate} onDelete={onDelete} onEdit={onEdit} />}
        {isAdmin && !isOwn && (
          <button
            onClick={e => { e.stopPropagation(); onEdit && onEdit(provider.id); }}
            style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(29,78,216,0.85)', color: '#fff',
              border: 'none', borderRadius: 99, padding: '4px 11px',
              fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-ui)', letterSpacing: '0.02em',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 1px 6px rgba(0,0,0,0.2)',
            }}
          >
            Edit
          </button>
        )}
      </div>

      {/* ── Card body ──────────────────────────────────────────── */}
      <div className="card-body-pad">
        {/* Category tag */}
        <div style={{
          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
          color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          {catLabel}
        </div>

        {/* Multi-listing pills or single title */}
        {allListings.length > 1 ? (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
            {allListings.map(l => (
              <button key={l.id}
                onClick={e => { e.stopPropagation(); navigate(providerUrl(l.name || provider.name, l.id)); }}
                style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  border: '1.5px solid var(--gray-200)', background: 'var(--gray-50)',
                  color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-900)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--gray-900)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--gray-200)'; }}
              >
                {listingLabel(l)}
              </button>
            ))}
          </div>
        ) : (
          hasPhoto && (
            <div style={{
              fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
              fontSize: 18, fontWeight: 700, color: 'var(--text)',
              lineHeight: 1.2, marginBottom: 4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {label}
            </div>
          )
        )}

        {/* Bio — hidden on very small cards */}
        {provider.bio && (
          <p className="card-bio" style={{
            fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)',
            lineHeight: 1.45, marginBottom: 8,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {provider.bio}
          </p>
        )}

        {/* ── Seller row ─────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: provider.bio ? 0 : 6 }}>
          {mediaUrl(provider.avatar_url) ? (
            <img src={mediaUrl(provider.avatar_url)} alt="" style={{
              width: 26, height: 26, borderRadius: '50%', objectFit: 'cover',
              border: '2px solid #fff', boxShadow: '0 0 0 1px var(--gray-200)',
              flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, color: '#fff',
              border: '2px solid #fff', boxShadow: '0 0 0 1px var(--gray-200)',
            }}>
              {initials(provider.name)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {provider.name}
            </div>
            {provider.rating > 0 && (
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                <span style={{ color: '#F59E0B' }}>★</span> {provider.rating.toFixed(1)}
                <span style={{ opacity: 0.7 }}> ({provider.review_count})</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnMenu({ menuRef, menuOpen, setMenuOpen, navigate, onDelete, onEdit }) {
  return (
    <div ref={menuRef} style={{ position: 'absolute', top: 10, right: 10 }}
      onClick={e => e.stopPropagation()}>
      <button
        onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
        style={{
          background: 'rgba(255,255,255,0.9)', border: 'none',
          borderRadius: 99, width: 30, height: 30, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: 'var(--gray-700)', fontWeight: 700,
          boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
        }}
      >
        ···
      </button>
      {menuOpen && (
        <div style={{
          position: 'absolute', right: 0, top: 36,
          background: '#fff', border: '1px solid var(--gray-200)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: 156, zIndex: 50, overflow: 'hidden',
        }}>
          <button
            onClick={e => {
              e.stopPropagation(); setMenuOpen(false);
              if (onEdit) onEdit();
              else navigate('/dashboard/provider');
            }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 16px', background: 'none', border: 'none',
              fontSize: 13, color: 'var(--text)', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontWeight: 500,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Edit listing
          </button>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(false); if (onDelete) onDelete(); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 16px', background: 'none', border: 'none',
              fontSize: 13, color: 'var(--danger)', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontWeight: 500,
              borderTop: '1px solid var(--gray-100)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Delete listing
          </button>
        </div>
      )}
    </div>
  );
}
