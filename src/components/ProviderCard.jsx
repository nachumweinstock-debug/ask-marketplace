import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mediaUrl } from '../lib/media';

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function listingLabel(l) {
  return l.title || l.subcategory || l.custom_category ||
    { tutor: 'Tutoring', barber: 'Haircuts', 'hebrew tutor': 'Hebrew Tutoring',
      fitness: 'Fitness', tennis: 'Fitness' }[l.category] || l.category;
}

function categoryEyebrow(l) {
  if (l.custom_category) return l.custom_category.toUpperCase();
  const map = { tutor: 'TUTORING', barber: 'BARBER', 'hebrew tutor': 'HEBREW', fitness: 'FITNESS', tennis: 'FITNESS', other: 'SERVICE' };
  return map[l.category] || 'SERVICE';
}

function formatDot(sessionType) {
  if (!sessionType || sessionType === 'in-person') return { color: '#0E8345', label: 'IN-PERSON' };
  if (sessionType === 'zoom') return { color: '#7C3AED', label: 'ZOOM' };
  return { color: '#7C3AED', label: 'ZOOM & IN-PERSON' };
}

export default function ProviderCard({ provider, isOwn, onDelete }) {
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

  const fmt = formatDot(provider.session_type);

  // ── Variant B: Photo-forward ──
  if (hasPhoto) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => navigate(`/providers/${provider.id}`)}
        style={{
          position: 'relative', cursor: 'pointer',
          background: 'var(--cream-50)',
          border: `1px solid ${hovered ? 'var(--ink-900)' : isOwn ? '#86EFAC' : 'var(--cream-200)'}`,
          borderRadius: 16, overflow: 'hidden',
          boxShadow: hovered ? '0 12px 32px -16px rgba(10,10,10,0.12)' : 'none',
          transform: hovered ? 'translateY(-2px)' : 'none',
          transition: 'box-shadow .22s cubic-bezier(0.2,0.8,0.2,1), transform .22s cubic-bezier(0.2,0.8,0.2,1), border-color .22s cubic-bezier(0.2,0.8,0.2,1)',
        }}
      >
        {/* Cover photo */}
        <div style={{ position: 'relative', height: 180, overflow: 'hidden', background: 'var(--cream-100)' }}>
          <img src={provider.listing_image} alt={provider.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
            background: 'linear-gradient(to top, rgba(10,10,10,0.45), transparent)',
          }} />
          {/* Price overlay */}
          <div style={{
            position: 'absolute', bottom: 12, right: 14,
            fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 20,
            color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,0.3)',
          }}>
            {provider.price_per_session > 0 ? `$${provider.price_per_session}` : 'Free'}
          </div>
          {/* Format dot */}
          <div style={{
            position: 'absolute', top: 12, right: 14,
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
            color: '#fff', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 5,
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: fmt.color, flexShrink: 0 }} />
            {fmt.label}
          </div>
        </div>

        {/* Content below photo */}
        <div style={{ padding: '18px 22px 22px' }}>
          {isOwn && <OwnBadge count={allListings.length} />}

          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.08em', color: 'var(--ink-500)',
            marginBottom: 6, textTransform: 'uppercase',
          }}>
            {categoryEyebrow(provider)}
          </div>

          {allListings.length > 1 ? (
            <MultiListingPills allListings={allListings} navigate={navigate} />
          ) : (
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600,
              color: 'var(--ink-900)', lineHeight: 1.15, marginBottom: 8,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontOpticalSizing: 'auto',
            }}>
              {listingLabel(provider)}
            </div>
          )}

          {/* Bio */}
          <p style={{
            fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-700)',
            lineHeight: 1.55, marginBottom: 14,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {provider.bio || 'No description provided.'}
          </p>

          {/* Bottom row */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {mediaUrl(provider.avatar_url) ? (
                <img src={mediaUrl(provider.avatar_url)} alt="" style={{
                  width: 28, height: 28, borderRadius: '50%', objectFit: 'cover',
                  border: '1px solid var(--cream-200)',
                }} />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--cream-100)', border: '1px solid var(--cream-300)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10,
                  color: 'var(--ink-700)',
                }}>
                  {initials(provider.name)}
                </div>
              )}
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>
                {provider.name}
              </span>
              <RatingBadge rating={provider.rating} count={provider.review_count} sessions={provider.completed_sessions} />
            </div>
          </div>
        </div>

        {isOwn && <OwnMenu menuRef={menuRef} menuOpen={menuOpen} setMenuOpen={setMenuOpen} navigate={navigate} onDelete={onDelete} hasPhoto />}
      </div>
    );
  }

  // ── Variant A: Service-forward (default) ──
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/providers/${provider.id}`)}
      style={{
        position: 'relative', cursor: 'pointer',
        background: isOwn ? '#FAFFF8' : 'var(--cream-50)',
        border: `1px solid ${hovered ? 'var(--ink-900)' : isOwn ? '#86EFAC' : 'var(--cream-200)'}`,
        borderRadius: 16, padding: 24, overflow: 'hidden',
        boxShadow: hovered ? '0 12px 32px -16px rgba(10,10,10,0.12)' : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow .22s cubic-bezier(0.2,0.8,0.2,1), transform .22s cubic-bezier(0.2,0.8,0.2,1), border-color .22s cubic-bezier(0.2,0.8,0.2,1)',
      }}
    >
      {isOwn && <OwnBadge count={allListings.length} />}

      {/* Format dot — top right */}
      <div style={{
        position: 'absolute', top: 20, right: 22,
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
        color: 'var(--ink-500)', letterSpacing: '0.06em',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: fmt.color, flexShrink: 0 }} />
        {fmt.label}
      </div>

      {/* Category eyebrow */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.08em', color: 'var(--ink-500)',
        marginBottom: 8, textTransform: 'uppercase',
      }}>
        {categoryEyebrow(provider)}
      </div>

      {/* Title */}
      {allListings.length > 1 ? (
        <MultiListingPills allListings={allListings} navigate={navigate} />
      ) : (
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600,
          color: 'var(--ink-900)', lineHeight: 1.1, marginBottom: 8,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontOpticalSizing: 'auto',
        }}>
          {listingLabel(provider)}
        </div>
      )}

      {/* Bio */}
      <p style={{
        fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--ink-700)',
        lineHeight: 1.55, marginBottom: 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {provider.bio || 'No description provided.'}
      </p>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--cream-200)', margin: '20px 0' }} />

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {mediaUrl(provider.avatar_url) ? (
            <img src={mediaUrl(provider.avatar_url)} alt="" style={{
              width: 28, height: 28, borderRadius: '50%', objectFit: 'cover',
              border: '1px solid var(--cream-200)',
            }} />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--cream-100)', border: '1px solid var(--cream-300)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 10,
              color: 'var(--ink-700)',
            }}>
              {initials(provider.name)}
            </div>
          )}
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>
            {provider.name}
          </span>
          <RatingBadge rating={provider.rating} count={provider.review_count} sessions={provider.completed_sessions} />
        </div>

        {/* Price */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 20,
          color: hovered ? 'var(--accent)' : 'var(--ink-900)',
          transition: 'color .22s cubic-bezier(0.2,0.8,0.2,1)',
          display: 'flex', alignItems: 'baseline', gap: 3,
        }}>
          {provider.price_per_session > 0 ? `$${provider.price_per_session}` : 'Free'}
          {provider.price_per_session > 0 && (
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 400, fontSize: 12, color: 'var(--ink-500)' }}>/session</span>
          )}
        </div>
      </div>

      {isOwn && <OwnMenu menuRef={menuRef} menuOpen={menuOpen} setMenuOpen={setMenuOpen} navigate={navigate} onDelete={onDelete} />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RatingBadge({ rating, count, sessions }) {
  if (!rating && !sessions) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
      {rating > 0 && (
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-500)' }}>
          <span style={{ color: '#F59E0B' }}>★</span> {rating.toFixed(1)}
          <span style={{ opacity: 0.6, marginLeft: 2 }}>({count})</span>
        </span>
      )}
      {sessions > 0 && (
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--ink-500)' }}>
          {rating > 0 && '· '}{sessions} session{sessions !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function OwnBadge({ count }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
      letterSpacing: '0.06em', color: '#166534',
      background: '#DCFCE7', borderRadius: 999,
      padding: '3px 10px', marginBottom: 10, textTransform: 'uppercase',
    }}>
      {count > 1 ? `YOUR ${count} LISTINGS` : 'YOUR LISTING'}
    </div>
  );
}

function MultiListingPills({ allListings, navigate }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
      {allListings.map(l => (
        <button
          key={l.id}
          onClick={e => { e.stopPropagation(); navigate(`/providers/${l.id}`); }}
          style={{
            padding: '5px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
            border: '1px solid var(--cream-300)',
            background: 'var(--cream-50)', color: 'var(--ink-900)',
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
            transition: 'background .12s, border-color .12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink-900)'; e.currentTarget.style.color = 'var(--cream-50)'; e.currentTarget.style.borderColor = 'var(--ink-900)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-50)'; e.currentTarget.style.color = 'var(--ink-900)'; e.currentTarget.style.borderColor = 'var(--cream-300)'; }}
        >
          {listingLabel(l)}
        </button>
      ))}
    </div>
  );
}

function OwnMenu({ menuRef, menuOpen, setMenuOpen, navigate, onDelete, hasPhoto }) {
  return (
    <div ref={menuRef} style={{ position: 'absolute', top: hasPhoto ? 192 : 16, right: 12 }}
      onClick={e => e.stopPropagation()}>
      <button
        onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
        style={{
          background: 'rgba(251,249,246,0.9)', border: '1px solid var(--cream-200)',
          borderRadius: 999, width: 28, height: 28, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: 'var(--ink-500)', fontWeight: 700, lineHeight: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        ···
      </button>
      {menuOpen && (
        <div style={{
          position: 'absolute', right: 0, top: 34,
          background: 'var(--cream-50)', border: '1px solid var(--cream-200)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: 160, zIndex: 50, overflow: 'hidden',
        }}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(false); navigate('/dashboard/provider?tab=availability'); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 16px', background: 'none', border: 'none',
              fontSize: 13, color: 'var(--ink-900)', cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-100)'}
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
              fontSize: 13, color: 'var(--danger)', cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              borderTop: '1px solid var(--cream-200)',
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
