import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

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

function TextInput({ type = 'text', placeholder, value, onChange, autoFocus }) {
  return (
    <input type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)} required autoFocus={autoFocus}
      style={inputStyle}
      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
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

// ── Verification code input ────────────────────────────────────────────────────

function CodeInput({ onComplete, resetKey }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const r0 = useRef(); const r1 = useRef(); const r2 = useRef();
  const r3 = useRef(); const r4 = useRef(); const r5 = useRef();
  const refs = [r0, r1, r2, r3, r4, r5];

  useEffect(() => { refs[0].current?.focus(); }, []);

  // Reset boxes when parent signals an error (resetKey changes)
  useEffect(() => {
    if (resetKey) {
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => refs[0].current?.focus(), 0);
    }
  }, [resetKey]);

  function handleChange(i, val) {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) refs[i + 1].current?.focus();
    if (next.every(x => x)) onComplete(next.join(''));
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(''));
      onComplete(text);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '20px 0' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 44, height: 52, textAlign: 'center',
            fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-ui)',
            border: `1.5px solid ${d ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 8, background: '#fff', color: 'var(--text)',
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = digits[i] ? 'var(--primary)' : 'var(--border)'}
        />
      ))}
    </div>
  );
}

// ── Sign Up ────────────────────────────────────────────────────────────────────

export function SignUp() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [userId, setUserId] = useState(null);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [emailOk, setEmailOk] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [codeResetKey, setCodeResetKey] = useState(0);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', {
        email: form.email.toLowerCase(),
        name: form.name,
      });
      setUserId(data.userId);
      setVerifyEmail(data.email);
      setEmailOk(data.emailOk !== false);
      setVerifying(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCode(code) {
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/verify', { userId, code });
      await loginWithToken(data.token, data.user);
      navigate(redirect || '/dashboard/student');
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect code');
      setCodeResetKey(k => k + 1); // clear the boxes
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true); setResendMsg('');
    try {
      await api.post('/auth/resend', { userId });
      setResendMsg('New code sent!');
    } catch {
      setResendMsg('Failed to resend.');
    } finally {
      setResendLoading(false);
    }
  }

  if (verifying) return (
    <Wrapper>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>
          Check your email
        </div>
        {emailOk ? (
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 4 }}>
            We sent a 6-digit code to<br />
            <strong style={{ color: 'var(--text)' }}>{verifyEmail}</strong>
          </div>
        ) : (
          <div style={{
            background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8,
            padding: '10px 14px', fontSize: 12.5, color: '#9A3412', marginBottom: 8, textAlign: 'left',
          }}>
            Couldn't send the email — check your spam folder or use "Resend code" below.
            If it still doesn't arrive, contact support.
          </div>
        )}
        <Err msg={error} />
        <CodeInput onComplete={handleCode} resetKey={codeResetKey} />
        {loading && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -8 }}>Verifying…</div>}
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={handleResend} disabled={resendLoading} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12.5, color: 'var(--primary)', fontWeight: 500,
          }}>
            {resendLoading ? 'Sending…' : 'Resend code'}
          </button>
          {resendMsg && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{resendMsg}</span>}
        </div>
      </div>
    </Wrapper>
  );

  return (
    <Wrapper>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
        Create account
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>We'll email you a code to verify — no password needed.</p>
      <form onSubmit={handleSubmit}>
        <Field label="Full name">
          <TextInput placeholder="Your name" value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="Email">
          <TextInput type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
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
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [userId, setUserId] = useState(null);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [emailOk, setEmailOk] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [codeResetKey, setCodeResetKey] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.toLowerCase() });
      setUserId(data.userId);
      setVerifyEmail(data.email);
      setEmailOk(data.emailOk !== false);
      setVerifying(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCode(code) {
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/verify', { userId, code });
      await loginWithToken(data.token, data.user);
      navigate(redirect || (data.user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student'));
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect code');
      setCodeResetKey(k => k + 1);
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true); setResendMsg('');
    try {
      await api.post('/auth/resend', { userId });
      setResendMsg('New code sent!');
    } catch {
      setResendMsg('Failed to resend.');
    } finally {
      setResendLoading(false);
    }
  }

  if (verifying) return (
    <Wrapper>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>
          Check your email
        </div>
        {emailOk ? (
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 4 }}>
            We sent a 6-digit code to<br />
            <strong style={{ color: 'var(--text)' }}>{verifyEmail}</strong>
          </div>
        ) : (
          <div style={{
            background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8,
            padding: '10px 14px', fontSize: 12.5, color: '#9A3412', marginBottom: 8, textAlign: 'left',
          }}>
            Couldn't send the email — check your spam or use "Resend code" below.
          </div>
        )}
        <Err msg={error} />
        <CodeInput onComplete={handleCode} resetKey={codeResetKey} />
        {loading && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -8 }}>Verifying…</div>}
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={handleResend} disabled={resendLoading} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12.5, color: 'var(--primary)', fontWeight: 500,
          }}>
            {resendLoading ? 'Sending…' : 'Resend code'}
          </button>
          {resendMsg && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{resendMsg}</span>}
        </div>
      </div>
    </Wrapper>
  );

  return (
    <Wrapper>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
        Welcome back
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Enter your email and we'll send you a code.</p>
      <form onSubmit={handleSubmit}>
        <Field label="Email">
          <TextInput type="email" placeholder="you@email.com" value={email} onChange={setEmail} autoFocus />
        </Field>
        <Err msg={error} />
        <Btn loading={loading} label="Send code" loadingLabel="Sending..." />
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20, marginBottom: 0 }}>
          No account?{' '}
          <Link to={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
        </p>
      </form>
    </Wrapper>
  );
}

