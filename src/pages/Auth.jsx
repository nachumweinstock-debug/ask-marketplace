import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

const BLUE = '#2B6CB0';

const INPUT = {
  width: '100%', border: '1px solid #E2E8F0', borderRadius: 8,
  padding: '10px 12px', fontSize: 13, outline: 'none',
  background: '#fff', color: '#1A1A2E',
};
const LABEL = { fontSize: 12, fontWeight: 500, color: '#64748B', marginBottom: 5, display: 'block' };

const YU_EMAIL = /^[^\s@]+@(mail\.)?yu\.edu$/i;

function AuthLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 7, background: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 12,
          }}>ASK</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>YU Services</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Yeshiva University</div>
          </div>
        </Link>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '28px 24px' }}>
          {children}
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 16 }}>
          @yu.edu and @mail.yu.edu addresses only
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function PwField({ label, value, onChange, placeholder = 'Password' }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} required minLength={6}
          placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...INPUT, paddingRight: 36 }} />
        <button type="button" onClick={() => setShow(s => !s)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </Field>
  );
}

function PrimaryBtn({ loading, label, loadingLabel, disabled }) {
  return (
    <button type="submit" disabled={loading || disabled} style={{
      width: '100%', background: loading || disabled ? '#93C5FD' : BLUE, color: '#fff',
      border: 'none', borderRadius: 8, padding: '11px', fontSize: 13,
      fontWeight: 500, cursor: loading || disabled ? 'not-allowed' : 'pointer',
      marginTop: 6,
    }}>
      {loading ? loadingLabel : label}
    </button>
  );
}

function ErrMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background: '#FFF0F0', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>
      {msg}
    </div>
  );
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '', wantProvider: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const emailError = form.email && !YU_EMAIL.test(form.email)
    ? 'Must be a @yu.edu or @mail.yu.edu address'
    : '';

  async function handleSubmit(e) {
    e.preventDefault();
    if (emailError) return;
    setError(''); setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email.toLowerCase(),
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            want_provider: form.wantProvider,
          },
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>📧</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E', marginBottom: 8 }}>
            Check your email
          </div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>
            We sent a confirmation link to<br />
            <strong style={{ color: '#1A1A2E' }}>{form.email}</strong>
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 12 }}>
            Click the link to activate your account, then come back to log in.
          </div>
          <Link to="/login" style={{ display: 'inline-block', marginTop: 20, fontSize: 13, color: BLUE, fontWeight: 500, textDecoration: 'none' }}>
            Back to login →
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>Create your account</div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Join the YU student marketplace</div>
      </div>
      <form onSubmit={handleSubmit}>
        <Field label="Full Name">
          <input type="text" required placeholder="Your name" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={INPUT} />
        </Field>
        <Field label="YU Email">
          <input type="email" required placeholder="you@yu.edu" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={INPUT} />
          {emailError && <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>{emailError}</div>}
        </Field>
        <PwField label="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="At least 6 characters" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <input type="checkbox" id="wantProvider" checked={form.wantProvider}
            onChange={e => setForm(f => ({ ...f, wantProvider: e.target.checked }))}
            style={{ width: 14, height: 14, accentColor: BLUE }} />
          <label htmlFor="wantProvider" style={{ fontSize: 12, color: '#64748B', cursor: 'pointer' }}>
            I want to offer services too
          </label>
        </div>

        <ErrMsg msg={error} />
        <PrimaryBtn loading={loading} label="Create account" loadingLabel="Creating..." disabled={!!emailError && form.email.length > 0} />
        <p style={{ textAlign: 'center', fontSize: 12, color: '#64748B', marginTop: 16 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: BLUE, fontWeight: 500 }}>Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

export function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <AuthLayout>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>Welcome back</div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Sign in to your account</div>
      </div>
      <form onSubmit={handleSubmit}>
        <Field label="YU Email">
          <input type="email" required placeholder="you@yu.edu" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={INPUT} />
        </Field>
        <PwField label="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
        <div style={{ textAlign: 'right', marginBottom: 14, marginTop: -6 }}>
          <Link to="/forgot-password" style={{ fontSize: 12, color: BLUE }}>Forgot password?</Link>
        </div>
        <ErrMsg msg={error} />
        <PrimaryBtn loading={loading} label="Sign in" loadingLabel="Signing in..." />
        <p style={{ textAlign: 'center', fontSize: 12, color: '#64748B', marginTop: 16 }}>
          No account?{' '}
          <Link to="/signup" style={{ color: BLUE, fontWeight: 500 }}>Sign up</Link>
        </p>
      </form>
    </AuthLayout>
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

  if (sent) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>✉️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E', marginBottom: 8 }}>
            Check your email
          </div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7 }}>
            If <strong style={{ color: '#1A1A2E' }}>{email}</strong> is registered,<br />
            we sent a password reset link.
          </div>
          <Link to="/login" style={{ display: 'inline-block', marginTop: 20, fontSize: 13, color: BLUE, fontWeight: 500, textDecoration: 'none' }}>
            ← Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>Reset password</div>
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 20 }}>
        Enter your YU email and we'll send a reset link.
      </div>
      <form onSubmit={handleSubmit}>
        <Field label="YU Email">
          <input type="email" required placeholder="you@yu.edu" value={email}
            onChange={e => setEmail(e.target.value)} style={INPUT} />
        </Field>
        <ErrMsg msg={error} />
        <PrimaryBtn loading={loading} label="Send reset link" loadingLabel="Sending..." />
      </form>
      <p style={{ textAlign: 'center', marginTop: 16 }}>
        <Link to="/login" style={{ fontSize: 12, color: '#64748B' }}>← Back to login</Link>
      </p>
    </AuthLayout>
  );
}
