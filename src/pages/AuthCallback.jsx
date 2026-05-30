import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { return null; }
}

const inputStyle = {
  width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 13.5, outline: 'none',
  background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)',
  boxSizing: 'border-box', transition: 'border-color .15s',
};

function finishOAuth(token, dest, navigate) {
  // Write to localStorage — shared across ALL same-origin windows including
  // Chrome PWA and regular browser tabs (unlike BroadcastChannel which is
  // browsing-context-group scoped and can't cross PWA ↔ browser boundaries).
  try {
    localStorage.setItem('ask_oauth_result', JSON.stringify({ token, dest, ts: Date.now() }));
  } catch {}

  // Also try BroadcastChannel + opener postMessage as belt-and-suspenders
  try { const ch = new BroadcastChannel('ask_oauth'); ch.postMessage({ type: 'ask_oauth_success', token, dest }); ch.close(); } catch {}
  if (window.opener && !window.opener.closed) {
    try { window.opener.postMessage({ type: 'ask_oauth_success', token, dest }, window.location.origin); } catch {}
    window.close();
    return;
  }

  // Close this tab/window (opened as popup or new tab for OAuth)
  window.close();

  // If close didn't work, this IS the main window — navigate directly
  setTimeout(() => navigate(dest || '/dashboard/student', { replace: true }), 50);
}

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]       = useState('loading'); // 'loading' | 'tos' | 'phone' | 'done'
  const [dest, setDest]       = useState('/dashboard/student');
  const [token, setToken]     = useState('');
  const [phone, setPhone]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [tosError, setTosError]     = useState(false);
  const [needsPhone, setNeedsPhone] = useState(false);

  useEffect(() => {
    async function handle() {
      const rawToken = params.get('token');
      const next  = params.get('next') || '';
      const error = params.get('error');

      if (error || !rawToken) {
        try { localStorage.setItem('ask_oauth_result', JSON.stringify({ token: null, dest: null, ts: Date.now() })); } catch {}
        try { const ch = new BroadcastChannel('ask_oauth'); ch.postMessage({ type: 'ask_oauth_success', token: null, dest: null }); ch.close(); } catch {}
        if (window.opener && !window.opener.closed) {
          try { window.opener.postMessage({ type: 'ask_oauth_success', token: null, dest: null }, window.location.origin); } catch {}
          window.close();
          return;
        }
        window.close();
        setTimeout(() => navigate(`/login${error && error !== 'cancelled' ? `?error=${error}` : ''}`, { replace: true }), 50);
        return;
      }

      const decoded = parseJwt(rawToken);
      await loginWithToken(rawToken, decoded ? { ...decoded } : null, { skipMe: true });
      setToken(rawToken);

      // Fetch full user — only prompt phone for brand-new accounts (created <60s ago)
      try {
        const { data: user } = await api.get('/auth/me');
        const destination = next || (user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student');
        const isNew = user.created_at && (Date.now() - new Date(user.created_at).getTime() < 60000);
        setDest(destination);
        if (isNew) {
          setNeedsPhone(!user.phone);
          setStep('tos');
        } else {
          finishOAuth(rawToken, destination, navigate);
        }
      } catch {
        finishOAuth(rawToken, next || '/dashboard/student', navigate);
      }
    }
    handle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTosAccept(e) {
    e.preventDefault();
    if (!tosChecked) { setTosError(true); return; }
    setTosError(false);
    if (needsPhone) setStep('phone');
    else finishOAuth(token, dest, navigate);
  }

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    if (phone.trim()) {
      setSaving(true);
      try { await api.put('/account', { phone: phone.trim() }); } catch {}
    }
    finishOAuth(token, dest, navigate);
  }

  if (step === 'tos') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text)' }}>ASK</span>
        </div>
        <div className="card" style={{ padding: '32px 28px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 6 }}>
            Before you continue
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
            Please review and accept our terms before using ASK.
          </p>
          <form onSubmit={handleTosAccept}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
              <input
                type="checkbox"
                checked={tosChecked}
                onChange={e => { setTosChecked(e.target.checked); setTosError(false); }}
                style={{ marginTop: 3, cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
                I agree to the{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                  Privacy Policy
                </Link>
              </span>
            </label>
            {tosError && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
                padding: '9px 14px', fontSize: 12.5, color: '#DC2626', marginBottom: 14,
              }}>
                You must agree to continue.
              </div>
            )}
            <button type="submit" style={{
              width: '100%', background: 'var(--primary)', color: '#fff',
              border: 'none', borderRadius: 9, padding: '12px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}>
              I agree — continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (step === 'loading') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  // Phone prompt — shown for Google users without a phone on file
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text)' }}>ASK</span>
        </div>
        <div className="card" style={{ padding: '32px 28px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 6 }}>
            One last thing
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
            Add your phone number to get text notifications when someone books you, confirms a session, or sends you a message.
          </p>
          <form onSubmit={handlePhoneSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>
                Phone number
              </label>
              <input
                type="tel"
                placeholder="(555) 555-5555"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoFocus
                autoComplete="tel"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <button type="submit" disabled={saving} style={{
              width: '100%', background: saving ? '#93C5FD' : 'var(--primary)',
              color: '#fff', border: 'none', borderRadius: 9,
              padding: '12px', fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-ui)', marginBottom: 10,
            }}>
              {saving ? 'Saving...' : 'Save & continue'}
            </button>
            <button type="button" onClick={() => navigate(dest, { replace: true })} style={{
              width: '100%', background: 'none', border: 'none',
              color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--font-ui)', padding: '6px',
            }}>
              Skip for now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
