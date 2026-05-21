import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mediaUrl } from '../lib/media';
import { providerUrl } from '../lib/providerUrl';
import { trackEvent } from '../lib/analytics';
import SavedTutorButton from './SavedTutorButton';
import TrustBadges from './TrustBadges';
import { discountedPrice, discountPercent, money } from '../lib/pricing';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function listingLabel(l) {
  return l.title || l.subcategory || l.custom_category ||
    { tutor: 'Instruction', barber: 'Haircuts', 'hebrew tutor': 'Hebrew Instruction',
      fitness: 'Fitness', tennis: 'Fitness' }[l.category] || l.category;
}

function categoryLabel(l) {
  if (l.custom_category) return l.custom_category;
  const map = { tutor: 'Instruction', barber: 'Barber', 'hebrew tutor': 'Hebrew', fitness: 'Fitness', tennis: 'Fitness', other: 'Service' };
  return map[l.category] || 'Service';
}

// Warm gradients for cards without photos
const CAT_GRADIENT = {
  tutor:        'linear-gradient(135deg, #2558D8 0%, #0E1B4D 100%)',
  'hebrew tutor': 'linear-gradient(135deg, #17130F 0%, #705E3E 100%)',
  fitness:      'linear-gradient(135deg, #0F7B55 0%, #083C2A 100%)',
  tennis:       'linear-gradient(135deg, #0F7B55 0%, #083C2A 100%)',
  barber:       'linear-gradient(135deg, #F15A24 0%, #7C2410 100%)',
  other:        'linear-gradient(135deg, #F3C74F 0%, #17130F 100%)',
};

function cardGradient(category, customCategory) {
  if (customCategory) {
    // Hash the name for a consistent warm color
    let hash = 0;
    for (const c of customCategory) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
    const hue = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${hue},55%,42%) 0%, hsl(${(hue+34)%360},50%,24%) 100%)`;
  }
  return CAT_GRADIENT[category] || CAT_GRADIENT.other;
}

function formatMode(sessionType) {
  if (!sessionType || sessionType === 'in-person') return 'In-person';
  if (sessionType === 'zoom') return 'Online';
  return 'Both';
}

function campusLabel(provider) {
  if (provider.session_type === 'zoom') return null;
  return provider.campus || 'WILF';
}

export default function ProviderCard({ provider, isOwn, onDelete, onEdit, isAdmin, saved = false, onSavedChange, onTagClick }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
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
  const campus = campusLabel(provider);
  const label = listingLabel(provider);
  const catLabel = categoryLabel(provider);
  const discount = discountPercent(provider);
  const displayPrice = discountedPrice(provider);
  const sitewideSale = discount > 0 && provider.first_time_discount_scope === 'sitewide';
  const showTrustStats = Boolean(
    provider.trust?.response_rate > 0 ||
    provider.trust?.completed_sessions > 0 ||
    provider.trust?.saved_count > 0
  );
  function openProvider(target = provider) {
    trackEvent('tutor_card_clicked', {
      provider_id: target.id,
      category: target.category,
      custom_category: target.custom_category,
      subcategory: target.subcategory,
    });
    navigate(providerUrl(target.name || provider.name, target.id, target.username || provider.username));
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => openProvider(provider)}
      style={{
        position: 'relative', cursor: 'pointer',
        background: '#fff',
        borderRadius: 8, overflow: 'hidden',
        boxShadow: hovered ? '0 18px 42px rgba(23,19,15,0.12)' : '0 1px 0 rgba(23,19,15,0.04), 0 10px 28px rgba(23,19,15,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow 0.16s ease, transform 0.16s ease, border-color 0.16s ease',
        border: isOwn ? '2px solid #0F7B55' : '1px solid rgba(23,19,15,0.10)',
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
          background: 'linear-gradient(to top, rgba(23,19,15,0.58), transparent)',
        }} />

        {/* Mode pill — bottom left */}
        {!isOwn && (
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 3 }}>
            <SavedTutorButton
              tutorId={provider.id}
              initialSaved={saved || !!provider.saved}
              compact
              onChange={(next) => onSavedChange?.(provider.id, next)}
            />
          </div>
        )}

        {/* Sale badge */}
        {sitewideSale && (
          <div className="ibiza-badge" style={{
            position: 'absolute', top: 10, left: isAdmin && !isOwn ? 68 : 10, zIndex: 4,
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 6px 18px rgba(124,58,237,0.5)',
            borderRadius: 999,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 950,
            fontFamily: 'var(--font-ui)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            15% OFF
          </div>
        )}

        {/* Mode pill — bottom left */}
        <div className="card-mode-pill" style={{
          position: 'absolute', bottom: 10, left: 10,
          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
          color: '#fff', letterSpacing: '0.04em',
          background: 'rgba(23,19,15,0.68)',
          backdropFilter: 'blur(6px)',
          borderRadius: 6, padding: '4px 9px',
          maxWidth: 'calc(100% - 70px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {campus ? `${mode} · ${campus}` : mode}
        </div>

        {/* Price — bottom right */}
        <div className="card-price" style={{
          position: 'absolute', bottom: 10, right: 10,
          textAlign: 'right',
        }}>
          {provider.price_per_session > 0 && discount > 0 && (!provider.surge_percent || sitewideSale) ? (
            <>
              {/* Top row: original crossed out + badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
                  color: '#fff', textDecoration: 'line-through',
                  opacity: 0.55, lineHeight: 1,
                }}>
                  {money(provider.price_per_session)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800,
                  background: sitewideSale ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  color: '#fff', borderRadius: 5,
                  padding: '2px 6px', lineHeight: 1.3,
                  letterSpacing: '0.02em',
                }}>
                  −{discount}%
                </span>
              </div>
              {/* Bottom row: big discounted price */}
              <div style={{
                fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
                fontSize: 24, fontWeight: 760, lineHeight: 1,
                color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.35)',
              }}>
                <span className={sitewideSale ? 'ibiza-price' : undefined}>
                  {money(displayPrice)}
                </span>
              </div>
            </>
          ) : (
            <div style={{
              fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
              fontSize: 22, fontWeight: 700, lineHeight: 1,
              color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.3)',
            }}>
              {provider.price_per_session > 0 ? money(provider.price_per_session) : 'Free'}
            </div>
          )}
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
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800,
          color: 'var(--orange)', letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          {catLabel}
        </div>

        {/* Listing title — always shown when there's a photo, otherwise the gradient card already shows it */}
        {hasPhoto && (
          <div style={{
            fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
            fontSize: 19, fontWeight: 760, color: 'var(--text)',
            lineHeight: 1.2, marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {label}
          </div>
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

        <TrustBadges trust={provider.trust} compact />

        {showTrustStats && (
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8,
            fontSize: 10.5, color: 'var(--muted)', fontWeight: 700,
          }}>
            {provider.trust?.response_rate > 0 && <span>{provider.trust.response_rate}% response</span>}
            {provider.trust?.completed_sessions > 0 && <span>{provider.trust.completed_sessions} sessions</span>}
            {provider.trust?.saved_count > 0 && <span>{provider.trust.saved_count} saves</span>}
          </div>
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
