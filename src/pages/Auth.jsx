import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Eye, EyeOff, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

// ─── Shared layout ────────────────────────────────────────────────────────────

function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#fdf9f2' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <span className="font-bold text-2xl text-slate-900">ASK</span>
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-7">
          {children}
        </div>
        <p className="text-center text-slate-400 text-xs mt-5">@yu.edu and @mail.yu.edu only</p>
      </div>
    </div>
  );
}

// ─── 6-digit code boxes ───────────────────────────────────────────────────────

function CodeInput({ onComplete, disabled }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);

  function handleChange(i, val) {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) onComplete(next.join(''));
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = [...digits];
    text.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    refs.current[Math.min(text.length, 5)]?.focus();
    if (text.length === 6) onComplete(text);
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:border-blue-500 bg-white transition-colors disabled:opacity-40"
          style={{ borderColor: d ? '#3b82f6' : '#fde68a' }}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

// ─── Resend button with countdown ────────────────────────────────────────────

function ResendButton({ onResend }) {
  const [countdown, setCountdown] = useState(0);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  async function handleClick() {
    setResent(false);
    await onResend();
    setResent(true);
    setCountdown(30);
  }

  if (resent && countdown > 0) return <p className="text-center text-green-700 text-sm">Code sent! Resend in {countdown}s</p>;
  if (countdown > 0) return <p className="text-center text-slate-400 text-sm">Resend in {countdown}s</p>;
  return (
    <button onClick={handleClick} className="w-full text-center text-blue-600 text-sm font-medium hover:underline">
      Resend code
    </button>
  );
}

// ─── Verify email screen (signup) ─────────────────────────────────────────────

function VerifyScreen({ userId, email, onBack, onVerified }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCode(code) {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify', { userId, code });
      onVerified(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code');
      setLoading(false);
    }
  }

  async function handleResend() {
    await api.post('/auth/resend', { userId });
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm -ml-1">
        <ArrowLeft size={15} /> Back
      </button>
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Mail size={22} className="text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
        <p className="text-slate-500 text-sm mt-1">
          6-digit code sent to <span className="font-medium text-slate-700">{email}</span>
        </p>
      </div>
      <CodeInput onComplete={handleCode} disabled={loading} />
      {loading && <p className="text-center text-slate-400 text-sm">Verifying...</p>}
      {error && <p className="text-center text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <ResendButton onResend={handleResend} />
    </div>
  );
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export function SignUp() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      if (data.needsVerification) setPending({ userId: data.userId, email: data.email });
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <AuthLayout>
        <VerifyScreen
          userId={pending.userId}
          email={pending.email}
          onBack={() => setPending(null)}
          onVerified={(token, user) => { login(token, user); navigate('/dashboard/student'); }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Create account</h2>
      <p className="text-slate-500 text-sm mb-5">Join the YU student marketplace</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name">
          <input type="text" required placeholder="Your name" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="YU Email">
          <input type="email" required placeholder="you@yu.edu" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Password">
          <PasswordInput value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))}
            showPw={showPw} onToggle={() => setShowPw(s => !s)} placeholder="At least 6 characters" />
        </Field>
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <SubmitBtn loading={loading} label="Continue" loadingLabel="Sending code..." />
        <p className="text-center text-slate-500 text-sm">
          Have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate(data.user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student');
    } catch (err) {
      const d = err.response?.data;
      if (d?.needsVerification) {
        setPending({ userId: d.userId, email: d.email });
      } else {
        setError(d?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <AuthLayout>
        <VerifyScreen
          userId={pending.userId}
          email={pending.email}
          onBack={() => setPending(null)}
          onVerified={(token, user) => {
            login(token, user);
            navigate(user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student');
          }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome back</h2>
      <p className="text-slate-500 text-sm mb-5">Sign in to your ASK account</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="YU Email">
          <input type="email" required placeholder="you@yu.edu" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Password">
          <PasswordInput value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))}
            showPw={showPw} onToggle={() => setShowPw(s => !s)} placeholder="Your password" />
        </Field>
        <div className="text-right -mt-1">
          <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot password?</Link>
        </div>
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <SubmitBtn loading={loading} label="Sign In" loadingLabel="Signing in..." />
        <p className="text-center text-slate-500 text-sm">
          No account? <Link to="/signup" className="text-blue-600 font-medium hover:underline">Sign up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export function ForgotPassword() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // step: 'email' | 'code' | 'newpw'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmail(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setUserId(data.userId);
      setStep('code');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleCode(c) {
    setError('');
    setCode(c);
    setStep('newpw');
  }

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { userId, code, password });
      login(data.token, data.user);
      navigate(data.user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student');
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
      if (err.response?.data?.error?.toLowerCase().includes('code')) setStep('code');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    const { data } = await api.post('/auth/forgot-password', { email });
    setUserId(data.userId);
  }

  return (
    <AuthLayout>
      {step === 'email' && (
        <div className="space-y-5">
          <div>
            <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound size={22} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Forgot password?</h2>
            <p className="text-slate-500 text-sm mt-1">We&apos;ll send a reset code to your YU email.</p>
          </div>
          <form onSubmit={handleEmail} className="space-y-4">
            <Field label="YU Email">
              <input type="email" required placeholder="you@yu.edu" value={email}
                onChange={e => setEmail(e.target.value)} />
            </Field>
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <SubmitBtn loading={loading} label="Send Reset Code" loadingLabel="Sending..." />
          </form>
          <p className="text-center">
            <Link to="/login" className="text-slate-500 text-sm hover:underline flex items-center justify-center gap-1">
              <ArrowLeft size={13} /> Back to login
            </Link>
          </p>
        </div>
      )}

      {step === 'code' && (
        <div className="space-y-5">
          <button onClick={() => setStep('email')} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm -ml-1">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Mail size={22} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
            <p className="text-slate-500 text-sm mt-1">
              Code sent to <span className="font-medium text-slate-700">{email}</span>
            </p>
          </div>
          <CodeInput onComplete={handleCode} />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <ResendButton onResend={handleResend} />
        </div>
      )}

      {step === 'newpw' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Set new password</h2>
            <p className="text-slate-500 text-sm mt-1">Choose something you&apos;ll remember.</p>
          </div>
          <form onSubmit={handleReset} className="space-y-4">
            <Field label="New Password">
              <PasswordInput value={password} onChange={setPassword}
                showPw={showPw} onToggle={() => setShowPw(s => !s)} placeholder="At least 6 characters" />
            </Field>
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <SubmitBtn loading={loading} label="Reset Password" loadingLabel="Saving..." />
          </form>
        </div>
      )}
    </AuthLayout>
  );
}

// ─── Small reusable pieces ────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1.5 block">{label}</label>
      {/* clone child input with shared classes */}
      {addInputClass(children)}
    </div>
  );
}

function addInputClass(element) {
  return {
    ...element,
    props: {
      ...element.props,
      className: 'w-full border border-amber-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
    },
  };
}

function PasswordInput({ value, onChange, showPw, onToggle, placeholder }) {
  return (
    <div className="relative">
      <input
        type={showPw ? 'text' : 'password'}
        required
        minLength={6}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-amber-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function ErrorMsg({ children }) {
  return <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{children}</p>;
}

function SubmitBtn({ loading, label, loadingLabel }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
      {loading ? loadingLabel : label}
    </button>
  );
}
