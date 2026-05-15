import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../lib/analytics';

const NAVY  = '#1B3A6B';
const CREAM = '#FAF7F2';

const SERVICES = [
  { emoji: '🎓', name: 'Tutoring',          desc: 'Any subject, any level' },
  { emoji: '💈', name: 'Barbers',            desc: 'Campus cuts, your schedule' },
  { emoji: '💪', name: 'Personal Training',  desc: 'Fitness on your terms' },
  { emoji: '🪩', name: 'StudyParty',         desc: 'Study live with your campus' },
  { emoji: '🎵', name: 'Music Lessons',       desc: 'Piano, guitar & more' },
  { emoji: '🙋', name: 'Request a Service',   desc: 'Need something else? Post it' },
];

export default function Go() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0→nothing, 1→logo, 2→all

  useEffect(() => {
    if (!loading && user) { navigate('/', { replace: true }); return; }
    trackEvent('qr_landing_visit');
    const t1 = setTimeout(() => setStep(1), 80);
    const t2 = setTimeout(() => setStep(2), 420);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [user, loading]);

  if (loading) return null;

  return (
    <div style={{
      minHeight: '100dvh',
      background: NAVY,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif",
    }}>
      <style>{`
        @keyframes go-logo-drop {
          from { opacity: 0; transform: translateY(-16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes go-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes go-card-in {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes go-glow {
          0%,100% { box-shadow: 0 6px 32px rgba(245,158,11,0.45); }
          50%      { box-shadow: 0 6px 48px rgba(245,158,11,0.72), 0 0 0 8px rgba(245,158,11,0.08); }
        }
        @keyframes go-wifi-dot {
          0%,100% { opacity: 1; }
          45%     { opacity: 0.25; }
          55%     { opacity: 0.25; }
        }
        @keyframes go-underline-grow {
          from { width: 0; }
          to   { width: 56px; }
        }
        .go-cta {
          display: block; width: 100%; border: none; cursor: pointer;
          background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
          color: #fff; border-radius: 15px;
          padding: 17px 28px;
          font-size: 16.5px; font-weight: 700;
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.01em;
          text-decoration: none; text-align: center;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
          animation: go-glow 2.8s ease-in-out infinite;
          -webkit-tap-highlight-color: transparent;
        }
        .go-cta:active { transform: scale(0.98); }
        .go-cta:hover  { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(245,158,11,0.55); }
      `}</style>

      {/* ── Subtle texture layer ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle at 18% 20%, rgba(255,255,255,0.045) 0%, transparent 55%),
                          radial-gradient(circle at 82% 78%, rgba(245,158,11,0.1) 0%, transparent 45%)`,
      }} />

      {/* ── Faint large ASK watermark behind everything ── */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', userSelect: 'none', overflow: 'hidden',
      }}>
        <span style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 'clamp(200px, 55vw, 380px)',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.032)',
          letterSpacing: '-0.05em', lineHeight: 1,
        }}>ASK</span>
      </div>

      {/* ── Top bar ── */}
      <header style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px',
        opacity: step >= 1 ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}>
        <div style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 24, fontWeight: 400,
          color: CREAM, letterSpacing: '-0.01em',
        }}>ASK</div>
        <Link to="/login" style={{
          fontSize: 13, fontWeight: 600, color: 'rgba(250,247,242,0.55)',
          textDecoration: 'none', padding: '6px 14px',
          border: '1px solid rgba(250,247,242,0.18)',
          borderRadius: 99,
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = CREAM; e.currentTarget.style.borderColor = 'rgba(250,247,242,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(250,247,242,0.55)'; e.currentTarget.style.borderColor = 'rgba(250,247,242,0.18)'; }}
        >
          Sign in
        </Link>
      </header>

      {/* ── Hero ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center',
        padding: '20px 28px 32px',
      }}>

        {/* Big ASK wordmark */}
        <div style={{
          position: 'relative', marginBottom: 18,
          animation: step >= 1 ? 'go-logo-drop 0.55s cubic-bezier(0.34,1.2,0.64,1) both' : 'none',
          opacity: step >= 1 ? 1 : 0,
        }}>
          <div style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(80px, 24vw, 128px)',
            fontWeight: 400,
            color: CREAM,
            letterSpacing: '-0.04em',
            lineHeight: 0.88,
          }}>ASK</div>
          {/* Orange underline */}
          <div style={{
            height: 5, background: 'linear-gradient(90deg, #F59E0B, #F97316)',
            borderRadius: 3, margin: '10px auto 0',
            animation: step >= 1 ? 'go-underline-grow 0.6s ease both 0.35s' : 'none',
            width: step >= 1 ? 56 : 0,
          }} />
        </div>

        {/* Tagline */}
        {step >= 2 && (
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: 'rgba(250,247,242,0.45)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 22,
            animation: 'go-up 0.4s ease both',
          }}>
            By YU students · For YU students
          </div>
        )}

        {/* Wi-Fi acknowledgment pill */}
        {step >= 2 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 99, padding: '8px 16px',
            marginBottom: 28,
            animation: 'go-up 0.4s ease both 0.06s',
          }}>
            {/* Animated signal bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
              {[4, 7, 10, 12].map((h, i) => (
                <div key={i} style={{
                  width: 3, height: h, borderRadius: 1.5,
                  background: i < 2 ? '#F59E0B' : 'rgba(245,158,11,0.3)',
                  animation: i < 2 ? `go-wifi-dot ${1.4 + i * 0.3}s ease-in-out infinite` : 'none',
                }} />
              ))}
            </div>
            <span style={{
              fontSize: 12.5, fontWeight: 600,
              color: '#F59E0B',
              lineHeight: 1.35,
            }}>
              YU's Wi-Fi is still approving our site (≈20 days). You're on data — you're good.
            </span>
          </div>
        )}

        {/* Headline */}
        {step >= 2 && (
          <h1 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(34px, 9.5vw, 52px)',
            fontWeight: 400, color: CREAM,
            margin: '0 0 14px', lineHeight: 1.1,
            letterSpacing: '-0.02em',
            animation: 'go-up 0.45s ease both 0.1s',
          }}>
            Find the right<br />
            <span style={{
              background: 'linear-gradient(90deg, #F59E0B, #F97316)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>YU student</span> for the job.
          </h1>
        )}

        {/* Sub */}
        {step >= 2 && (
          <p style={{
            fontSize: 15.5, lineHeight: 1.6,
            color: 'rgba(250,247,242,0.58)',
            margin: '0 auto',
            maxWidth: 340,
            animation: 'go-up 0.45s ease both 0.18s',
          }}>
            Tutors, barbers, personal trainers, and more — all students from your own campus. Book in two taps.
          </p>
        )}
      </div>

      {/* ── Services grid ── */}
      {step >= 2 && (
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '0 20px 28px',
          maxWidth: 500, margin: '0 auto', width: '100%',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}>
            {SERVICES.map(({ emoji, name, desc }, i) => (
              <div key={name} style={{
                background: 'rgba(250,247,242,0.07)',
                border: '1px solid rgba(250,247,242,0.1)',
                borderRadius: 14,
                padding: '14px 14px 12px',
                backdropFilter: 'blur(6px)',
                animation: `go-card-in 0.4s ease both ${0.22 + i * 0.06}s`,
              }}>
                <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 7 }}>{emoji}</div>
                <div style={{
                  fontSize: 13.5, fontWeight: 700, color: CREAM,
                  lineHeight: 1.25, marginBottom: 3,
                }}>{name}</div>
                <div style={{
                  fontSize: 11.5, color: 'rgba(250,247,242,0.42)',
                  lineHeight: 1.3,
                }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA block ── */}
      {step >= 2 && (
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '4px 20px 10px',
          maxWidth: 500, margin: '0 auto', width: '100%',
          animation: 'go-up 0.45s ease both 0.58s',
        }}>
          <Link to="/signup" className="go-cta">
            Create your free account →
          </Link>

          <p style={{
            textAlign: 'center', margin: '10px 0 0',
            fontSize: 12.5, fontWeight: 600,
            color: 'rgba(250,247,242,0.48)',
            letterSpacing: '0.02em',
          }}>
            Free to join · No credit card, ever
          </p>

          <p style={{
            textAlign: 'center', margin: '12px 0 0',
            fontSize: 13.5,
            color: 'rgba(250,247,242,0.38)',
          }}>
            Already a member?{' '}
            <Link to="/login" style={{
              color: 'rgba(250,247,242,0.65)', fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = CREAM}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(250,247,242,0.65)'}
            >
              Sign in
            </Link>
          </p>
        </div>
      )}

      {/* ── Footer ── */}
      <footer style={{
        position: 'relative', zIndex: 2,
        marginTop: 'auto',
        padding: '20px 24px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
        opacity: step >= 2 ? 1 : 0,
        transition: 'opacity 0.6s ease 0.7s',
      }}>
        <a
          href="https://www.instagram.com/uasklive"
          target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: 12, fontWeight: 600,
            color: 'rgba(250,247,242,0.28)',
            textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(250,247,242,0.65)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(250,247,242,0.28)'}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
          </svg>
          @uasklive
        </a>
        <span style={{ color: 'rgba(250,247,242,0.12)', fontSize: 11 }}>·</span>
        <span style={{ fontSize: 12, color: 'rgba(250,247,242,0.18)', fontWeight: 500 }}>
          uask.live
        </span>
      </footer>
    </div>
  );
}
