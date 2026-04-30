import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'tutor', label: 'Tutors' },
  { id: 'barber', label: 'Barbers' },
  { id: 'languages', label: 'Languages' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'other', label: 'Other' },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{
        background: 'var(--cream-100)',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex', alignItems: 'center',
        padding: '0 48px',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', padding: '80px 0' }}>
          <div className="hero-grid">
            {/* Left */}
            <div className="fade-up">
              <h1 style={{
                fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
                fontSize: 'clamp(56px, 7vw, 88px)',
                color: 'var(--ink-900)', lineHeight: 1.02,
                marginBottom: 24, letterSpacing: '-0.03em',
                fontWeight: 600,
              }}>
                Find your<br/>guy.
              </h1>
              <p style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 18, color: 'var(--ink-500)', lineHeight: 1.6,
                maxWidth: 400, marginBottom: 44,
              }}>
                Tutors, barbers, fitness coaches, and more — all from students on your campus. Book in seconds.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/browse')}
                  style={{
                    background: 'var(--blue-600)', color: '#fff',
                    border: 'none', borderRadius: 12,
                    padding: '15px 32px', fontSize: 16, fontWeight: 500,
                    cursor: 'pointer', transition: 'background .2s, color .2s',
                    fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--blue-600)'; e.currentTarget.style.color = '#fff'; }}
                >
                  Browse listings →
                </button>
                <button
                  onClick={() => navigate(user ? '/create-listing' : '/signup')}
                  style={{
                    background: 'transparent', color: 'var(--ink-900)',
                    border: '1px solid var(--cream-300)', borderRadius: 12,
                    padding: '15px 32px', fontSize: 16, fontWeight: 500,
                    cursor: 'pointer', transition: 'border-color .2s',
                    fontFamily: 'var(--font-ui)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ink-900)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--cream-300)'}
                >
                  Post a service
                </button>
              </div>
            </div>

            {/* Right — editorial card stack */}
            <div className="hero-cards fade-up-delay" style={{ position: 'relative', height: 340 }}>
              {[
                { title: 'Calc I & II Tutoring', eyebrow: 'TUTORING', price: '$35', name: 'Ari K.', offset: { top: 80, left: 50 }, rotate: -4 },
                { title: 'Clean Fades', eyebrow: 'BARBER', price: '$20', name: 'Yosef M.', offset: { top: 40, left: 25 }, rotate: 2.5 },
                { title: 'Gemara & Hebrew', eyebrow: 'HEBREW', price: '$15', name: 'Moshe L.', offset: { top: 0, left: 0 }, rotate: -1 },
              ].map((card, i) => (
                <div key={i} style={{
                  position: 'absolute', ...card.offset,
                  transform: `rotate(${card.rotate}deg)`,
                  width: 280,
                  background: 'var(--cream-50)', border: '1px solid var(--cream-200)',
                  borderRadius: 16, padding: '22px 24px',
                  boxShadow: '0 8px 32px -12px rgba(10,10,10,0.10)',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
                    letterSpacing: '0.08em', color: 'var(--ink-500)', marginBottom: 6,
                  }}>
                    {card.eyebrow}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
                    fontSize: 22, fontWeight: 600, color: 'var(--ink-900)',
                    lineHeight: 1.15, marginBottom: 14,
                  }}>
                    {card.title}
                  </div>
                  <div style={{ height: 1, background: 'var(--cream-200)', marginBottom: 14 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>
                      {card.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--ink-900)' }}>
                      {card.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Categories ── */}
      <div style={{ background: 'var(--cream-100)', borderTop: '1px solid var(--cream-200)', padding: '40px 48px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="section-label" style={{ marginBottom: 16 }}>
            BROWSE BY CATEGORY
          </div>
          <div className="pill-row">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => navigate(id === 'all' ? '/browse' : `/browse?category=${id}`)}
                style={{
                  padding: '9px 22px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                  border: '1px solid var(--cream-200)',
                  background: 'var(--cream-50)', color: 'var(--ink-500)',
                  cursor: 'pointer', transition: 'all .15s',
                  fontFamily: 'var(--font-ui)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-600)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--blue-600)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-50)'; e.currentTarget.style.color = 'var(--ink-500)'; e.currentTarget.style.borderColor = 'var(--cream-200)'; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{ background: 'var(--cream-50)', borderTop: '1px solid var(--cream-200)', padding: '80px 48px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
            fontSize: 'clamp(36px, 4vw, 56px)',
            color: 'var(--ink-900)', lineHeight: 1.05,
            marginBottom: 16, letterSpacing: '-0.02em', fontWeight: 600,
          }}>
            Offer something?
          </h2>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 16, color: 'var(--ink-500)', marginBottom: 36, lineHeight: 1.6,
          }}>
            Post a listing in under a minute and start getting booked by classmates.
          </p>
          <Link
            to={user ? '/create-listing' : '/signup'}
            style={{
              display: 'inline-block',
              background: 'var(--ink-900)', color: 'var(--cream-50)',
              borderRadius: 12, padding: '15px 40px',
              fontSize: 16, fontWeight: 500, textDecoration: 'none',
              fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
              transition: 'background .2s, color .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--ink-900)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink-900)'; e.currentTarget.style.color = 'var(--cream-50)'; }}
          >
            Post a service →
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--cream-200)', background: 'var(--cream-100)',
        padding: '24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontOpticalSizing: 'auto',
          fontSize: 18, fontWeight: 600, color: 'var(--ink-900)',
        }}>ASK</span>
        <span style={{ fontSize: 13, color: 'var(--ink-500)', fontFamily: 'var(--font-ui)' }}>
          Yeshiva University Student Marketplace
        </span>
      </footer>
    </div>
  );
}
