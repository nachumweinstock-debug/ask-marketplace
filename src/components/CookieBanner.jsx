import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie_ok')) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem('cookie_ok', '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9000, width: 'clamp(300px, 92vw, 560px)',
      background: 'rgba(10,10,10,0.93)', backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: 16, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      <p style={{
        flex: 1, margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.82)',
        lineHeight: 1.55, fontFamily: 'var(--font-ui)', minWidth: 200,
      }}>
        We use cookies to keep you logged in and improve your experience.
        By continuing you agree to our{' '}
        <Link to="/cookies"
          style={{ color: '#93C5FD', textDecoration: 'none', fontWeight: 600 }}>
          Cookie Policy
        </Link>.
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={accept} style={{
          background: 'var(--primary)', color: '#fff', border: 'none',
          borderRadius: 999, padding: '8px 20px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
        }}>
          Got it
        </button>
      </div>
    </div>
  );
}
