import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
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

function PwInput({ placeholder = 'Password', value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} required minLength={6}
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
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
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
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Join the marketplace</p>
      <form onSubmit={handleSubmit}>
        <Field label="Full name">
          <TextInput placeholder="Your name" value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="Email">
          <TextInput type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Password">
          <PwInput placeholder="At least 6 characters" value={form.password} onChange={set('password')} />
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
  const [error, setError] = useState('');
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
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Sign in to your account</p>
      <form onSubmit={handleSubmit}>
        <Field label="Email">
          <TextInput type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} autoFocus />
        </Field>
        <Field label="Password">
          <PwInput value={form.password} onChange={set('password')} />
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
  const [userId, setUserId] = useState(null);
  const [step, setStep] = useState('email');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  async function handleEmailSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.toLowerCase() });
      setUserId(data.userId || null);
      setStep('code');
    } catch (err) {
      setError(err.response?.data?.error || 'Error sending reset code');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        userId, code: code.trim(), password,
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
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>Reset password</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        Enter the 6-digit code we sent to <strong style={{ color: 'var(--text)' }}>{email}</strong>,
        then choose a new password.
      </p>
      <form onSubmit={handleReset}>
        <Field label="Reset code">
          <TextInput placeholder="123456" value={code} onChange={setCode} autoFocus />
        </Field>
        <Field label="New password">
          <PwInput placeholder="At least 6 characters" value={password} onChange={setPassword} />
        </Field>
        <Err msg={error} />
        <Btn loading={loading} label="Set new password" loadingLabel="Saving..." />
        <p style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>Back to login</Link>
        </p>
      </form>
    </Wrapper>
  );

  return (
    <Wrapper>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>Reset password</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        Enter your email and we'll send a reset code.
      </p>
      <form onSubmit={handleEmailSubmit}>
        <Field label="Email">
          <TextInput type="email" placeholder="you@email.com" value={email} onChange={setEmail} autoFocus />
        </Field>
        <Err msg={error} />
        <Btn loading={loading} label="Send reset code" loadingLabel="Sending..." />
        <p style={{ textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>Back to login</Link>
        </p>
      </form>
    </Wrapper>
  );
}
