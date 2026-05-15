import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  {
    gradient: 'linear-gradient(135deg, #1B3A6B 0%, #2558D8 100%)',
    emoji: '👋',
    emojiSize: 64,
    title: 'Welcome to ASK',
    body: 'Your campus marketplace for tutoring, fitness, barbers, and more — all from fellow YU students.',
    cta: 'Show me around →',
  },
  {
    gradient: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
    emoji: '🔍',
    emojiSize: 64,
    title: 'Browse & Book',
    body: 'Find a tutor, barber, or fitness coach in seconds. Filter by price, rating, and availability — book right from the app.',
    cta: 'Next →',
  },
  {
    gradient: 'linear-gradient(135deg, #4C1D95 0%, #C026D3 100%)',
    emoji: '🪩',
    emojiSize: 64,
    title: 'StudyParty',
    body: "See who's studying live on campus. Join their session or start your own — show up and make it a party.",
    cta: 'Next →',
  },
  {
    gradient: 'linear-gradient(135deg, #C2410C 0%, #F97316 100%)',
    emoji: null,
    illustration: true,
    title: 'Everything\'s one click away',
    body: 'The orange tab on the left edge is your Quick Access panel — browse, post a listing, request help, and more.',
    cta: 'Show me →',
    isLast: true,
  },
];

function TabIllustration() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '0 24px',
    }}>
      {/* Simulated browser frame */}
      <div style={{
        width: 210, height: 118,
        background: 'rgba(255,255,255,0.12)',
        borderRadius: 10,
        border: '1.5px solid rgba(255,255,255,0.25)',
        position: 'relative',
        overflow: 'visible',
        backdropFilter: 'blur(4px)',
      }}>
        {/* Fake top bar */}
        <div style={{
          height: 22, background: 'rgba(255,255,255,0.15)',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px 8px 0 0',
          display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px',
        }}>
          {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.8 }} />
          ))}
        </div>

        {/* Fake content lines */}
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[80, 60, 70].map((w, i) => (
            <div key={i} style={{
              height: 7, borderRadius: 4,
              background: 'rgba(255,255,255,0.18)',
              width: `${w}%`,
            }} />
          ))}
        </div>

        {/* The orange tab sticking out left — animated */}
        <div style={{
          position: 'absolute', left: -22, top: '50%',
          transform: 'translateY(-50%)',
          width: 22, height: 52,
          background: 'linear-gradient(180deg, #FFF 0%, #FFE4D4 100%)',
          borderRadius: '0 12px 12px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 4,
          boxShadow: '3px 0 16px rgba(255,255,255,0.4)',
          animation: 'wt-tab-pulse 1.8s ease-in-out infinite',
        }}>
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
            <rect x="0.5" y="0.5" width="5" height="5" rx="1.5" fill="#C2410C"/>
            <rect x="8.5" y="0.5" width="5" height="5" rx="1.5" fill="#C2410C"/>
            <rect x="0.5" y="8.5" width="5" height="5" rx="1.5" fill="#C2410C"/>
            <rect x="8.5" y="8.5" width="5" height="5" rx="1.5" fill="#C2410C"/>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: 8, height: 1.5, background: '#C2410C', borderRadius: 2, opacity: 0.7 }} />
            ))}
          </div>
        </div>

        {/* Curved arrow pointing to tab */}
        <div style={{
          position: 'absolute', left: -72, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
        }}>
          <span style={{
            fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 700,
            color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap',
          }}>click this →</span>
        </div>
      </div>
    </div>
  );
}

export default function WelcomeWalkthrough() {
  const { user, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [animDir, setAnimDir] = useState(1); // 1 = forward, -1 = backward

  useEffect(() => {
    if (loading || !user) return;
    const key = `ask_walkthrough_${user.id}`;
    const lastShown = localStorage.getItem(key);
    if (lastShown) {
      const daysSince = (Date.now() - parseInt(lastShown, 10)) / 86400000;
      if (daysSince < 7) return;
    }
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, [user, loading]);

  if (!visible) return null;

  function dismiss() {
    if (user) localStorage.setItem(`ask_walkthrough_${user.id}`, Date.now().toString());
    setVisible(false);
  }

  function next() {
    const s = STEPS[step];
    if (s.isLast) {
      dismiss();
      setTimeout(() => window.dispatchEvent(new CustomEvent('qa:open')), 200);
      return;
    }
    setAnimDir(1);
    setStep(i => i + 1);
  }

  function back() {
    if (step === 0) return;
    setAnimDir(-1);
    setStep(i => i - 1);
  }

  const s = STEPS[step];

  return (
    <>
      <style>{`
        @keyframes wt-in  { from { opacity:0; transform:scale(0.94) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes wt-tab-pulse {
          0%,100% { box-shadow: 3px 0 16px rgba(255,255,255,0.4); }
          50%      { box-shadow: 3px 0 28px rgba(255,255,255,0.7), 0 0 0 6px rgba(255,255,255,0.12); }
        }
        @keyframes wt-step-fwd { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:translateX(0); } }
        @keyframes wt-step-bwd { from { opacity:0; transform:translateX(-22px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* Backdrop */}
      <div onClick={dismiss} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(17,13,10,0.58)',
        zIndex: 200,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        {/* Card */}
        <div onClick={e => e.stopPropagation()} style={{
          width: '100%', maxWidth: 420,
          background: '#fff',
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
          animation: 'wt-in 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) both',
        }}>
          {/* Colored header */}
          <div style={{
            height: 188,
            background: s.gradient,
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {/* Skip button */}
            <button onClick={dismiss} style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(255,255,255,0.18)', border: 'none',
              borderRadius: 99, padding: '5px 12px',
              fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            >
              Skip
            </button>

            {/* Step number */}
            <div style={{
              position: 'absolute', top: 16, left: 18,
              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800,
              color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {step + 1} / {STEPS.length}
            </div>

            {/* Emoji or illustration */}
            <div
              key={step}
              style={{
                animation: animDir > 0 ? 'wt-step-fwd 0.28s ease both' : 'wt-step-bwd 0.28s ease both',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', height: '100%',
              }}
            >
              {s.illustration ? (
                <TabIllustration />
              ) : (
                <span style={{ fontSize: 68, lineHeight: 1 }}>{s.emoji}</span>
              )}
            </div>
          </div>

          {/* Text content */}
          <div style={{ padding: '26px 28px 24px' }}>
            <div
              key={`text-${step}`}
              style={{ animation: animDir > 0 ? 'wt-step-fwd 0.28s ease both 0.05s' : 'wt-step-bwd 0.28s ease both 0.05s' }}
            >
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 760,
                color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.15,
              }}>
                {s.title}
              </h2>
              <p style={{
                fontFamily: 'var(--font-ui)', fontSize: 14.5, lineHeight: 1.55,
                color: 'var(--text-secondary)', margin: 0,
              }}>
                {s.body}
              </p>
            </div>

            {/* Progress dots + nav */}
            <div style={{
              marginTop: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {/* Back button or dots spacer */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {step > 0 && (
                  <button onClick={back} style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 99, padding: '8px 16px',
                    fontSize: 13, fontWeight: 600, color: 'var(--muted)',
                    cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    ← Back
                  </button>
                )}
              </div>

              {/* Dots */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {STEPS.map((_, i) => (
                  <button key={i} onClick={() => { setAnimDir(i > step ? 1 : -1); setStep(i); }} style={{
                    width: i === step ? 18 : 7,
                    height: 7, borderRadius: 99,
                    background: i === step ? 'var(--orange)' : 'var(--gray-200)',
                    border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'width 0.22s ease, background 0.22s ease',
                  }} />
                ))}
              </div>

              {/* CTA */}
              <button onClick={next} style={{
                background: 'var(--text)', color: '#fff',
                border: 'none', borderRadius: 99,
                padding: '10px 20px', fontSize: 13.5,
                fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                transition: 'opacity 0.15s, transform 0.15s',
                boxShadow: '0 4px 16px rgba(23,19,15,0.22)',
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {s.cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
