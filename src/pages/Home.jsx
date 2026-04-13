import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PREVIEW_CARDS = [
  { initials: 'YM', name: 'Yosef M.', category: 'Barbers', price: '$20', bio: 'Clean fades and lineups. Available on campus daily.' },
  { initials: 'AK', name: 'Ari K.', category: 'Tutors', price: '$35', bio: 'Calc I–II, Orgo, Stats. 4.0 GPA, 3 years experience.' },
  { initials: 'ML', name: 'Moshe L.', category: 'Hebrew', price: '$15', bio: 'Rashi, Gemara, conversational Hebrew. All levels.' },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'tutor', label: 'Tutors' },
  { id: 'barber', label: 'Barbers' },
  { id: 'hebrew tutor', label: 'Hebrew' },
  { id: 'tennis', label: 'Fitness' },
  { id: 'other', label: 'Other' },
];

function PreviewCard({ card, style }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E0D8',
      borderRadius: 14, padding: '18px 20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      width: 260,
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: '#EBF4FF', color: '#2B6CB0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-ui)', flexShrink: 0,
        }}>
          {card.initials}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1A1A', lineHeight: 1.2 }}>{card.name}</div>
          <span style={{
            display: 'inline-block', marginTop: 3,
            background: '#EBF4FF', color: '#2B6CB0',
            fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 999,
          }}>
            {card.category}
          </span>
        </div>
        <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 15, color: '#1A1A1A' }}>
          {card.price}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{card.bio}</p>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%', padding: '48px 0' }}>
          <div className="hero-grid">
            {/* Left */}
            <div className="fade-up">
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(48px, 6vw, 76px)',
                color: 'var(--text)', lineHeight: 1.08,
                marginBottom: 20, letterSpacing: '-1px',
              }}>
                Find your guy.
              </h1>
              <p style={{
                fontSize: 17, color: 'var(--muted)', lineHeight: 1.65,
                maxWidth: 380, marginBottom: 36,
              }}>
                Students offering tutoring, haircuts, Hebrew, and more — right on campus.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/browse')}
                  style={{
                    background: 'var(--primary)', color: '#fff',
                    border: 'none', borderRadius: 9,
                    padding: '13px 28px', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', transition: 'opacity .15s',
                    fontFamily: 'var(--font-ui)', letterSpacing: '0.1px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Browse listings
                </button>
                <button
                  onClick={() => navigate(user ? '/create-listing' : '/signup')}
                  style={{
                    background: 'transparent', color: 'var(--text)',
                    border: '1.5px solid var(--border)', borderRadius: 9,
                    padding: '13px 28px', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', transition: 'border-color .15s',
                    fontFamily: 'var(--font-ui)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  Post a service
                </button>
              </div>
            </div>

            {/* Right — stacked cards */}
            <div className="hero-cards" style={{ position: 'relative', height: 300 }}>
              <div style={{ position: 'absolute', top: 50, left: 40, transform: 'rotate(-5deg)' }}>
                <PreviewCard card={PREVIEW_CARDS[2]} />
              </div>
              <div style={{ position: 'absolute', top: 25, left: 20, transform: 'rotate(3deg)' }}>
                <PreviewCard card={PREVIEW_CARDS[1]} />
              </div>
              <div style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-1deg)' }}>
                <PreviewCard card={PREVIEW_CARDS[0]} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '28px 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
            Browse by category
          </div>
          <div className="pill-row">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => navigate(id === 'all' ? '/browse' : `/browse?category=${id}`)}
                style={{
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: '1.5px solid var(--border)',
                  background: 'var(--card)', color: 'var(--muted)',
                  cursor: 'pointer', transition: 'all .15s',
                  fontFamily: 'var(--font-ui)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--primary)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--card)';
                  e.currentTarget.style.color = 'var(--muted)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '60px 20px' }}>
        <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 4vw, 48px)',
            color: 'var(--text)', lineHeight: 1.1,
            marginBottom: 16, letterSpacing: '-0.5px',
          }}>
            Offer something?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>
            Post a listing in under a minute and start getting booked.
          </p>
          <Link
            to={user ? '/create-listing' : '/signup'}
            style={{
              display: 'inline-block',
              background: 'var(--primary)', color: '#fff',
              borderRadius: 999, padding: '13px 36px',
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Post a service
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)', background: 'var(--bg)',
        padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text)' }}>ASK</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Yeshiva University Student Marketplace</span>
      </footer>
    </div>
  );
}
