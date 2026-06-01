import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Camera, Eye, EyeOff } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../lib/analytics';
import { PRIVACY_VERSION, TERMS_VERSION } from './LegalPages';

const IG_URL = 'https://www.instagram.com/uasklive?igsh=d2Y1eXM4NTltbDd4';
const UNIVERSITY_SUGGESTIONS = [
  'Yeshiva University',
  'New York University',
  'Baruch College',
  'Columbia University',
  'Cornell University',
  'University of Michigan',
  'UCLA',
  'USC',
  'Indiana University',
  'University of Texas at Austin',
  'Rutgers University',
  'Northeastern University',
  'Boston University',
  'University of Florida',
  'Florida State University',
  'Fordham University',
  'Brooklyn College',
  'Queens College',
  'Hunter College',
  'Stern College for Women',
  'Sy Syms School of Business',
];

// Build the full API origin for OAuth redirects (needs absolute URL, not relative /api)
const RAW_API = import.meta.env.VITE_API_URL || '/api';
const API_ORIGIN = RAW_API.startsWith('http') ? RAW_API : `${window.location.origin}${RAW_API}`;

function SocialDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>or continue with</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

const APPLE_LOGO = (
  <svg width="15" height="18" viewBox="0 0 814 1000" aria-hidden="true">
    <path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 405.8 0 295.9 0 190.8c0-131.3 85.5-200.9 169.2-200.9 53.3 0 97.9 35.2 131.9 35.2 32.6 0 81.9-37.7 143.3-37.7 23.6 0 143.3 2.7 219.5 104.7zm-105-125.4c31.3-37 51.9-89 51.9-140.6 0-7.1-.6-14.3-1.9-20.1-49.5 1.9-107.9 33.2-143.3 75.7-28.1 31.8-55.5 83.3-55.5 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 43.5 0 99.3-29.4 133.3-69.9z"/>
  </svg>
);

function SocialButtons({ redirect }) {
  const params = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
  const googleUrl = `${API_ORIGIN}/auth/google${params}`;
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleError, setAppleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const isNative = Capacitor.isNativePlatform();

  async function handleAppleNative() {
    setAppleError('');
    setAppleLoading(true);
    try {
      const result = await SignInWithApple.authorize({
        clientId: 'live.uask.app',
        redirectURI: `${API_ORIGIN}/auth/apple/callback`,
        scopes: 'email name',
      });
      const { data } = await api.post('/auth/apple/native', {
        identityToken: result.response.identityToken,
        user: {
          name: [result.response.givenName, result.response.familyName].filter(Boolean).join(' '),
          email: result.response.email,
        },
      });
      await loginWithToken(data.token, data.user);
      navigate(redirect || '/');
    } catch (err) {
      if (err?.code !== 'USER_CANCELLED') {
        setAppleError('Apple Sign In failed — please try again.');
      }
    } finally {
      setAppleLoading(false);
    }
  }

  function handleGoogleClick(e) {
    e.preventDefault();
    setGoogleError('');
    setGoogleLoading(true);

    // Clear any stale result before starting
    localStorage.removeItem('ask_oauth_result');

    // Open OAuth in a new window/tab.
    // In Chrome Desktop PWA: out-of-scope URL opens in a regular Chrome browser tab.
    // localStorage IS shared across browsing context groups (unlike BroadcastChannel),
    // so the callback can write the token there and this window will pick it up.
    const authWin = window.open(googleUrl, '_blank');

    if (!authWin) {
      // Popup blocked — navigate current window (works in regular browser, not PWA)
      window.location.href = googleUrl;
      return;
    }

    // Poll localStorage every 500ms for the token written by AuthCallback
    const pollId = setInterval(() => {
      try {
        const raw = localStorage.getItem('ask_oauth_result');
        if (raw) {
          localStorage.removeItem('ask_oauth_result');
          clearInterval(pollId);
          const { token: oauthToken, dest } = JSON.parse(raw);
          setGoogleLoading(false);
          if (oauthToken) {
            loginWithToken(oauthToken, null, { skipMe: false }).then(() => {
              navigate(dest || redirect || '/dashboard/student', { replace: true });
            });
          } else {
            setGoogleError('Google sign-in failed — please try again.');
          }
          try { if (!authWin.closed) authWin.close(); } catch {}
          return;
        }
      } catch {}
      // Stop polling if user closed the window manually
      try { if (authWin.closed) { clearInterval(pollId); setGoogleLoading(false); } } catch {}
    }, 500);

    // Safety timeout: 5 minutes
    setTimeout(() => { clearInterval(pollId); setGoogleLoading(false); }, 300_000);
  }

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 9, padding: '10px 14px',
    fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-ui)',
    textDecoration: 'none', cursor: 'pointer', border: 'none', width: '100%',
    transition: 'opacity .15s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={handleGoogleClick} disabled={googleLoading} style={{
        ...btnBase,
        border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text)',
        opacity: googleLoading ? 0.7 : 1,
      }}
        onMouseEnter={e => { if (!googleLoading) { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.08)'; }}}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? 'Opening…' : 'Continue with Google'}
      </button>

      {isNative && (
        <button onClick={handleAppleNative} disabled={appleLoading}
          style={{ ...btnBase, background: '#000', color: '#fff', opacity: appleLoading ? 0.7 : 1 }}>
          {APPLE_LOGO}
          {appleLoading ? 'Signing in…' : 'Continue with Apple'}
        </button>
      )}

      {googleError && <p style={{ color: '#DC2626', fontSize: 12, textAlign: 'center', margin: 0 }}>{googleError}</p>}
      {appleError && <p style={{ color: '#DC2626', fontSize: 12, textAlign: 'center', margin: 0 }}>{appleError}</p>}
    </div>
  );
}

function CodeInput({ onComplete, resetKey }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => { refs[0].current?.focus(); }, []);
  useEffect(() => {
    if (resetKey) { setDigits(['', '', '', '', '', '']); setTimeout(() => refs[0].current?.focus(), 0); }
  }, [resetKey]);

  function handleChange(i, val) {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[i] = d; setDigits(next);
    if (d && i < 5) refs[i + 1].current?.focus();
    if (next.every(x => x)) onComplete(next.join(''));
  }
  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
  }
  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) { setDigits(text.split('')); onComplete(text); }
  }
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '24px 0 16px' }}>
      {digits.map((d, i) => (
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)} onPaste={handlePaste}
          style={{
            width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
            fontFamily: 'var(--font-ui)', borderRadius: 8, background: '#fff', color: 'var(--text)',
            border: `1.5px solid ${d ? 'var(--primary)' : 'var(--border)'}`, outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = digits[i] ? 'var(--primary)' : 'var(--border)'}
        />
      ))}
    </div>
  );
}

function Wrapper({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Link to="/" style={{ display: 'block', textAlign: 'center', marginBottom: 28, textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text)' }}>ASK</span>
        </Link>
        <div className="card" style={{ padding: '32px 28px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 13.5, outline: 'none',
  background: '#fff', color: 'var(--text)', fontFamily: 'var(--font-ui)',
  transition: 'border-color .15s', boxSizing: 'border-box',
};

function TextInput({ type = 'text', placeholder, value, onChange, autoFocus, autoComplete }) {
  return (
    <input type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)} required autoFocus={autoFocus}
      autoComplete={autoComplete}
      style={inputStyle}
      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
  );
}

function UniversityInput({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  const query = value.trim().toLowerCase();
  const matches = UNIVERSITY_SUGGESTIONS
    .filter((school) => !query || school.toLowerCase().includes(query))
    .slice(0, 7);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Start typing your university"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        required
        autoComplete="organization"
        style={inputStyle}
      />
      {focused && matches.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 30,
          overflow: 'hidden',
        }}>
          {matches.map((school) => (
            <button
              key={school}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(school);
                setFocused(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', border: 'none', background: school === value ? 'var(--accent)' : '#fff',
                padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: school === 'Yeshiva University' ? 700 : 600,
                color: 'var(--text)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
              onMouseLeave={e => e.currentTarget.style.background = school === value ? 'var(--accent)' : '#fff'}
            >
              <span>{school}</span>
              {school === 'Yeshiva University' && (
                <span style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.04em' }}>POPULAR</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PwInput({ placeholder = 'Password', value, onChange, autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} required minLength={8}
        autoComplete={autoComplete}
        style={{ ...inputStyle, paddingRight: 40 }}
        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      <button type="button" onClick={() => setShow(s => !s)} style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)',
        display: 'flex', padding: 2,
      }}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function Btn({ loading, label, loadingLabel }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%', background: loading ? '#93C5FD' : 'var(--primary)',
      color: '#fff', border: 'none', borderRadius: 9,
      padding: '12px', fontSize: 14, fontWeight: 600,
      cursor: loading ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-ui)', marginTop: 6,
      transition: 'opacity .15s',
    }}>
      {loading ? loadingLabel : label}
    </button>
  );
}

function Err({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 8, padding: '9px 14px',
      fontSize: 12.5, color: '#DC2626', marginBottom: 16,
    }}>
      {msg}
    </div>
  );
}

// ── Sign Up ────────────────────────────────────────────────────────────────────

export function SignUp() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const referralCode = searchParams.get('ref') || '';
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', university: '' });
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [error, setError] = useState(searchParams.get('error') === 'google_failed' ? 'Google sign-in failed — please try again.' : searchParams.get('error') === 'apple_failed' ? 'Apple sign-in failed — please try again.' : '');
  const [loading, setLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const code = referralCode.trim().toUpperCase();
    if (!code) return;
    try { localStorage.setItem('pendingReferral', code); } catch {}
  }, [referralCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    if (!agreedToPrivacy) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      setLoading(false);
      return;
    }
    if (!form.university.trim()) {
      setError('Please choose your university.');
      setLoading(false);
      return;
    }
    try {
      let pendingReferral = referralCode.trim().toUpperCase();
      try { pendingReferral = pendingReferral || localStorage.getItem('pendingReferral') || ''; } catch {}
      trackEvent('signup_started', { method: 'email', redirect: redirect || '', university: form.university.trim() });
      const { data } = await api.post('/auth/signup', {
        email: form.email.toLowerCase(),
        name: form.name,
        password: form.password,
        phone: form.phone,
        university: form.university.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referralCode: pendingReferral,
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      });
      if (pendingReferral && data.user?.id) {
        try {
          await api.post('/referrals/redeem', { newUserId: data.user.id, referralCode: pendingReferral });
        } catch {
        } finally {
          try { localStorage.removeItem('pendingReferral'); } catch {}
        }
      }
      await loginWithToken(data.token, data.user);
      trackEvent('signup_completed', { method: 'email', redirect: redirect || '', university: form.university.trim() });
      setCreatedAccount(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Wrapper>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
        Create account
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Join the marketplace</p>
      <SocialButtons redirect={redirect} />
      <SocialDivider />
      <form onSubmit={handleSubmit}>
        <Field label="Full name">
          <TextInput placeholder="Your name" value={form.name} onChange={set('name')} autoFocus autoComplete="name" />
        </Field>
        <Field label="Email">
          <TextInput type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <Field label="Password">
          <PwInput placeholder="At least 8 characters" value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <Field label="University">
          <UniversityInput value={form.university} onChange={set('university')} />
        </Field>
        <Field label="Phone number (for booking texts)">
          <TextInput type="tel" placeholder="(555) 555-5555" value={form.phone} onChange={set('phone')} autoComplete="tel" />
        </Field>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <input
            type="checkbox"
            id="privacy-agree"
            checked={agreedToPrivacy}
            onChange={e => setAgreedToPrivacy(e.target.checked)}
            style={{ marginTop: 2, cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }}
          />
          <label htmlFor="privacy-agree" style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, cursor: 'pointer' }}>
            I agree to the{' '}
            <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Privacy Policy
            </Link>
          </label>
        </div>
        <Err msg={error} />
        <Btn loading={loading} label="Create account" loadingLabel="Creating..." />
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20, marginBottom: 0 }}>
          Already have an account?{' '}
          <Link to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
        </p>
      </form>
      {createdAccount && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.62)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 18,
        }}>
          <div style={{
            width: '100%', maxWidth: 390, background: '#fff', borderRadius: 18,
            padding: '28px 24px', boxShadow: '0 18px 60px rgba(0,0,0,0.22)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: 16, margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)', color: '#fff',
            }}>
              <Camera size={25} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 25, color: 'var(--text)', marginBottom: 8 }}>
              Welcome to ASK
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 20 }}>
              Follow @uasklive for new listings, campus drops, and reposts when you share your profile.
            </p>
            <a href={IG_URL} target="_blank" rel="noopener noreferrer" style={{
              height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, textDecoration: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
              background: 'linear-gradient(90deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
              marginBottom: 10,
            }}>
              <Camera size={17} />
              Follow @uasklive
            </a>
            <button type="button" onClick={() => navigate(redirect || '/dashboard/student')} style={{
              width: '100%', height: 46, borderRadius: 12, border: '1.5px solid var(--border)',
              background: '#fff', color: 'var(--text)', fontSize: 14, fontWeight: 700,
              fontFamily: 'var(--font-ui)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Continue to ASK
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </Wrapper>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────────

export function Login() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(searchParams.get('error') === 'google_failed' ? 'Google sign-in failed — please try again.' : searchParams.get('error') === 'apple_failed' ? 'Apple sign-in failed — please try again.' : '');
  const [loading, setLoading] = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: form.email.toLowerCase(),
        password: form.password,
      });
      await loginWithToken(data.token, data.user);
      navigate(redirect || (data.user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student'));
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Wrapper>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
        Welcome back
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Sign in to your account</p>
      <SocialButtons redirect={redirect} />
      <SocialDivider />
      <form onSubmit={handleSubmit}>
        <Field label="Email">
          <TextInput type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} autoFocus autoComplete="email" />
        </Field>
        <Field label="Password">
          <PwInput value={form.password} onChange={set('password')} autoComplete="current-password" />
        </Field>
        <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 18 }}>
          <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>
        <Err msg={error} />
        <Btn loading={loading} label="Sign in" loadingLabel="Signing in..." />
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20, marginBottom: 0 }}>
          No account?{' '}
          <Link to={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
        </p>
      </form>
    </Wrapper>
  );
}

// ── Forgot Password ────────────────────────────────────────────────────────────

export function ForgotPassword() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('email'); // 'email' | 'code' | 'password'
  const [verifiedCode, setVerifiedCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeResetKey, setCodeResetKey] = useState(0);

  async function handleEmailSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.toLowerCase() });
      // Always advance to code step — server never reveals whether email exists
      setStep('code');
    } catch (err) {
      setError(err.response?.data?.error || 'Error sending reset code');
    } finally {
      setLoading(false);
    }
  }

  async function handleCode(code) {
    setError(''); setLoading(true);
    try {
      // Validate the code without changing the password yet (passes email, not userId)
      const { data } = await api.post('/auth/verify-reset-code', { email: email.toLowerCase(), code });
      if (data.ok) { setVerifiedCode(code); setStep('password'); }
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect code — check your email and try again');
      setCodeResetKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: email.toLowerCase(), code: verifiedCode, password,
      });
      await loginWithToken(data.token, data.user);
      navigate(data.user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student');
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'code') return (
    <Wrapper>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 10 }}>
          Check your email
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 4 }}>
          We sent a 6-digit code to<br />
          <strong style={{ color: 'var(--text)' }}>{email}</strong>
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 0 }}>
          Enter the code below — do not enter your email address.
        </p>
        <Err msg={error} />
        <CodeInput onComplete={handleCode} resetKey={codeResetKey} />
        {loading && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -8 }}>Checking…</p>}
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          Didn't get it? Check spam, or{' '}
          <button type="button" onClick={() => setStep('email')} style={{
            background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600,
            cursor: 'pointer', fontSize: 12, padding: 0,
          }}>try a different email</button>.
        </p>
      </div>
    </Wrapper>
  );

  if (step === 'password') return (
    <Wrapper>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
        Set new password
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Choose a new password for your account.</p>
      <form onSubmit={handlePasswordSubmit}>
        <Field label="New password">
          <PwInput placeholder="At least 8 characters" value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Err msg={error} />
        <Btn loading={loading} label="Set new password" loadingLabel="Saving..." />
      </form>
    </Wrapper>
  );

  return (
    <Wrapper>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
        Reset password
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        Enter your email and we'll send you a 6-digit code.
      </p>
      <form onSubmit={handleEmailSubmit}>
        <Field label="Email">
          <TextInput type="email" placeholder="you@email.com" value={email} onChange={setEmail} autoFocus />
        </Field>
        <Err msg={error} />
        <Btn loading={loading} label="Send code" loadingLabel="Sending..." />
        <p style={{ textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>Back to login</Link>
        </p>
      </form>
    </Wrapper>
  );
}
