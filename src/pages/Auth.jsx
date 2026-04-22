import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

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

function SocialButtons({ redirect }) {
  const params = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
  const googleUrl = `${API_ORIGIN}/auth/google${params}`;

  return (
    <a href={googleUrl} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      border: '1.5px solid var(--border)', borderRadius: 9, padding: '10px 14px',
      background: '#fff', color: 'var(--text)', textDecoration: 'none',
      fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-ui)',
      transition: 'border-color .15s, box-shadow .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </a>
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
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState(searchParams.get('error') === 'google_failed' ? 'Google sign-in failed — please try again.' : searchParams.get('error') === 'apple_failed' ? 'Apple sign-in failed — please try again.' : '');
  const [loading, setLoading] = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', {
        email: form.email.toLowerCase(),
        name: form.name,
        password: form.password,
        phone: form.phone,
      });
      await loginWithToken(data.token, data.user);
      navigate(redirect || '/dashboard/student');
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
        <Field label="Phone number (for booking texts)">
          <TextInput type="tel" placeholder="(555) 555-5555" value={form.phone} onChange={set('phone')} autoComplete="tel" />
        </Field>
        <Err msg={error} />
        <Btn loading={loading} label="Create account" loadingLabel="Creating..." />
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20, marginBottom: 0 }}>
          Already have an account?{' '}
          <Link to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
        </p>
      </form>
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
