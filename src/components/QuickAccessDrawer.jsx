import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ALL_LINKS = [
  { to: '/browse',         emoji: '🔍', label: 'Browse',         desc: 'Find services' },
  { to: '/studyparty',     emoji: '🪩', label: 'StudyParty',      desc: 'Join a live session', party: true },
  { to: '/find-a-tutor',   emoji: '🎓', label: 'Find a Tutor',    desc: 'Get matched fast' },
  { to: '/create-listing', emoji: '✏️', label: 'Post a Listing',  desc: 'Offer your service', authOnly: true },
  { to: '/help-wanted',    emoji: '🙋', label: 'Help Wanted',      desc: 'Request a service' },
  { to: '/saved-tutors',   emoji: '❤️', label: 'Saved',            desc: 'Your saved tutors', authOnly: true },
  { to: '/people',         emoji: '👥', label: 'People',           desc: 'YU community' },
  { to: '/referrals',      emoji: '🎁', label: 'Referrals',        desc: 'Invite friends', authOnly: true },
  { to: '/support',        emoji: '💬', label: 'Support',          desc: 'Get help' },
];

export default function QuickAccessDrawer() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [hintSeen, setHintSeen] = useState(() => !!localStorage.getItem('qa_hint_seen'));
  const [tabHovered, setTabHovered] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Listen for external open trigger (from walkthrough)
  useEffect(() => {
    function onOpen() { setOpen(true); }
    window.addEventListener('qa:open', onOpen);
    return () => window.removeEventListener('qa:open', onOpen);
  }, []);

  function handleTabClick() {
    setOpen(o => !o);
    if (!hintSeen) { setHintSeen(true); localStorage.setItem('qa_hint_seen', '1'); }
  }

  const links = ALL_LINKS.filter(l => !l.authOnly || user);

  return (
    <>
      <style>{`
        .qa-tab-btn { display: flex !important; }
        @media (max-width: 768px) { .qa-tab-btn { display: none !important; } }

        @keyframes qa-glow-pulse {
          0%, 100% { box-shadow: 4px 0 22px rgba(249,115,22,0.45); }
          50%       { box-shadow: 4px 0 36px rgba(249,115,22,0.75), 0 0 0 6px rgba(249,115,22,0.12); }
        }
        @keyframes qa-bars-wave {
          0%, 100% { transform: scaleX(1); }
          50%       { transform: scaleX(0.65); }
        }
        @keyframes qa-link-in {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes qa-badge-pop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* ── Backdrop ── */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(17,13,10,0.38)',
          zIndex: 47,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }} />
      )}

      {/* ── Slide-in panel ── */}
      <div style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 280,
        zIndex: 48,
        background: '#FDFCFB',
        transform: open ? 'translateX(0)' : 'translateX(-280px)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: '6px 0 60px rgba(23,19,15,0.18)',
        display: 'flex', flexDirection: 'column',
        pointerEvents: open ? 'auto' : 'none',
        borderRight: '1px solid rgba(23,19,15,0.07)',
      }}>
        {/* Header */}
        <div style={{
          padding: '100px 24px 20px',
          borderBottom: '1px solid rgba(23,19,15,0.07)',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 870,
            color: 'var(--text)', letterSpacing: '-0.01em',
          }}>ASK</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800,
            color: 'var(--orange)', letterSpacing: '0.14em', textTransform: 'uppercase',
            marginTop: 5,
          }}>Quick Access</div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {links.map(({ to, emoji, label, desc, party }, idx) => {
            const active = location.pathname === to
              || (to !== '/' && location.pathname.startsWith(to + '/'));
            return (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 24px',
                textDecoration: 'none',
                borderLeft: active
                  ? '3px solid var(--orange)'
                  : party
                  ? '3px solid rgba(192,38,211,0.22)'
                  : '3px solid transparent',
                background: active ? 'rgba(23,19,15,0.04)' : 'transparent',
                transition: 'background 0.12s',
                animation: open ? `qa-link-in 0.3s ease both ${0.04 + idx * 0.035}s` : 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(23,19,15,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(23,19,15,0.04)' : 'transparent'; }}
              >
                <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-ui)', fontSize: 14,
                    fontWeight: active ? 660 : 520,
                    color: party ? '#C026D3' : active ? 'var(--text)' : 'var(--ink-800)',
                    lineHeight: 1.2,
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-ui)', fontSize: 11.5,
                    color: 'var(--muted)', marginTop: 2, lineHeight: 1,
                  }}>
                    {desc}
                  </div>
                </div>
                {active && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--orange)', flexShrink: 0,
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '14px 24px 20px',
          borderTop: '1px solid rgba(23,19,15,0.07)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <kbd style={{
            background: 'rgba(23,19,15,0.07)', border: '1px solid rgba(23,19,15,0.12)',
            borderRadius: 5, padding: '2px 6px', fontSize: 9.5,
            fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontWeight: 700,
          }}>Esc</kbd>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--muted)' }}>
            to close
          </span>
        </div>
      </div>

      {/* ── Pull tab — MUCH bigger, orange, inviting ── */}
      <button
        className="qa-tab-btn"
        onClick={handleTabClick}
        onMouseEnter={() => setTabHovered(true)}
        onMouseLeave={() => setTabHovered(false)}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        style={{
          position: 'fixed',
          left: open ? 280 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: tabHovered && !open ? 44 : 36,
          height: 96,
          background: open
            ? 'linear-gradient(180deg, #292524 0%, #17130F 100%)'
            : 'linear-gradient(180deg, #F97316 0%, #C2410C 100%)',
          border: 'none', cursor: 'pointer',
          borderRadius: '0 16px 16px 0',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 7, padding: '0 4px',
          zIndex: 49,
          transition: 'left 0.3s cubic-bezier(0.32, 0.72, 0, 1), background 0.22s, width 0.18s ease',
          boxShadow: open
            ? '4px 0 20px rgba(0,0,0,0.22)'
            : tabHovered
            ? '4px 0 28px rgba(249,115,22,0.7)'
            : '4px 0 22px rgba(249,115,22,0.45)',
          animation: !hintSeen && !open ? 'qa-glow-pulse 2.2s ease-in-out 1s infinite' : 'none',
        }}
      >
        {open ? (
          /* Close chevron */
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M7 2L2 8L7 14" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <>
            {/* 2×2 grid icon */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="0.5" y="0.5" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.92)"/>
              <rect x="8.5" y="0.5" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.92)"/>
              <rect x="0.5" y="8.5" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.92)"/>
              <rect x="8.5" y="8.5" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.92)"/>
            </svg>

            {/* Vertical "MENU" label */}
            <span style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              fontSize: 8.5,
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.88)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              MENU
            </span>

            {/* Three grip bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  display: 'block',
                  width: tabHovered ? 14 : 10,
                  height: 1.5,
                  background: 'rgba(255,255,255,0.75)',
                  borderRadius: 2,
                  transition: 'width 0.18s ease',
                  transitionDelay: `${i * 0.04}s`,
                }} />
              ))}
            </div>
          </>
        )}
      </button>
    </>
  );
}
