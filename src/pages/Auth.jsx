import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

const BLUE = '#2563EB';
const YU_EMAIL = /^[^\s@]+@(mail\.)?yu\.edu$/i;

function Wrapper({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#F8F7F4',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, textDecoration: 'none', justifyContent: 'center' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 11, letterSpacing: 0.5,
          }}>ASK</div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>YU Services</span>
        </Link>
        <div style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Input({ type = 'text', placeholder, value, onChange, autoFocus }) {
  return (
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)} required autoFocus={autoFocus}
      style={{
        width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8,
        padding: '10px 12px', fontSize: 13.5, outline: 'none', background: '#fff',
        color: '#111', boxSizing: 'border-box', transition: 'border-color .15s',
      }}
      onFocus={e => e.target.style.borderColor = BLUE}
      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
    />
  );
}

function PwInput({ placeholder = 'Password', value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} required minLength={6}
        style={{
          width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8,
          padding: '10px 36px 10px 12px', fontSize: 13.5, outline: 'none',
          background: '#fff', color: '#111', boxSizing: 'border-box', transition: 'border-color .15s',
        }}
        onFocus={e => e.target.style.borderColor = BLUE}
        onBlur={e => e.target.style.borderColor = '#E5E7EB'}
      />
      <button type="button" onClick={() => setShow(s => !s)} style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2, display: 'flex',
      }}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function Btn({ loading, label, loadingLabel }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%', background: loading ? '#93C5FD' : BLUE, color: '#fff',
      border: 'none', borderRadius: 8, padding: '11px', fontSize: 13.5,
      fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
      transition: 'background .15s',
    }}>
      {loading ? loadingLabel : label}
    </button>
  );
}

function Err({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7,
      padding: '8px 12px', fontSize: 12.5, color: '#DC2626', marginBottom: 14,
    }}>
      {msg}
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', marginBottom: 5 }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const emailErr = form.email && !YU_EMAIL.test(form.email)
    ? 'Use your @yu.edu or @mail.yu.edu address' : '';

  async function handleSubmit(e) {
    e.preventDefault();
    if (emailErr) return;
    setError(''); setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email.toLowerCase(),
        password: form.password,
        options: { data: { full_name: form.name } },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  if (sent) return (
    <Wrapper>
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>📬</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>Check your inbox</div>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
          We sent a confirmation link to<br />
          <strong style={{ color: '#111' }}>{form.email}</strong>
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>
          Click the link to activate your account, then log in.
        </div>
        <Link to="/login" style={{ display: 'inline-block', marginTop: 20, fontSize: 13, color: BLUE, fontWeight: 600, textDecoration: 'none' }}>
          Go to login →
        </Link>
      </div>
    </Wrapper>
  );

  return (
    <Wrapper>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Create account</div>
        <div style={{ fontSize: 12.5, color: '#9CA3AF', marginTop: 3 }}>Join the YU student marketplace</div>
      </div>
      <form onSubmit={handleSubmit}>
        <Field label="Full name">
          <Input placeholder="Your name" value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="YU email">
          <Input type="email" placeholder="you@yu.edu" value={form.email} onChange={set('email')} />
          {emailErr && <div style={{ fontSize: 11.5, color: '#DC2626', marginTop: 4 }}>{emailErr}</div>}
        </Field>
        <Field label="Password">
          <PwInput placeholder="At least 6 characters" value={form.password} onChange={set('password')} />
        </Field>
        <Err msg={error} />
        <Btn loading={loading} label="Create account" loadingLabel="Creating..." />
        <p style={{ textAlign: 'center', fontSize: 12.5, color: '#9CA3AF', marginTop: 18, marginBottom: 0 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
        </p>
      </form>
    </Wrapper>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

export function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.toLowerCase(),
        password: form.password,
      });
      if (error) throw error;
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Wrapper>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Welcome back</div>
        <div style={{ fontSize: 12.5, color: '#9CA3AF', marginTop: 3 }}>Sign in to your account</div>
      </div>
      <form onSubmit={handleSubmit}>
        <Field label="YU email">
          <Input type="email" placeholder="you@yu.edu" value={form.email} onChange={set('email')} autoFocus />
        </Field>
        <Field label="Password">
          <PwInput value={form.password} onChange={set('password')} />
        </Field>
        <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 16 }}>
          <Link to="/forgot-password" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none' }}>Forgot password?</Link>
        </div>
        <Err msg={error} />
        <Btn loading={loading} label="Sign in" loadingLabel="Signing in..." />
        <p style={{ textAlign: 'center', fontSize: 12.5, color: '#9CA3AF', marginTop: 18, marginBottom: 0 }}>
          No account?{' '}
          <Link to="/signup" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
        </p>
      </form>
    </Wrapper>
  );
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err.message || 'Error sending reset email');
    } finally {
      setLoading(false);
    }
  }

  if (sent) return (
    <Wrapper>
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>✉️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>Check your email</div>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
          If <strong style={{ color: '#111' }}>{email}</strong> is registered,<br />
          we sent a password reset link.
        </div>
        <Link to="/login" style={{ display: 'inline-block', marginTop: 20, fontSize: 13, color: BLUE, fontWeight: 600, textDecoration: 'none' }}>
          ← Back to login
        </Link>
      </div>
    </Wrapper>
  );

  return (
    <Wrapper>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Reset password</div>
        <div style={{ fontSize: 12.5, color: '#9CA3AF', marginTop: 3 }}>
          Enter your YU email and we'll send a reset link.
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <Field label="YU email">
          <Input type="email" placeholder="you@yu.edu" value={email} onChange={setEmail} autoFocus />
        </Field>
        <Err msg={error} />
        <Btn loading={loading} label="Send reset link" loadingLabel="Sending..." />
        <p style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
          <Link to="/login" style={{ fontSize: 12.5, color: '#9CA3AF', textDecoration: 'none' }}>← Back to login</Link>
        </p>
      </form>
    </Wrapper>
  );
}
