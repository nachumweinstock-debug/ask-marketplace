import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]       = useState('loading'); // 'loading' | 'phone' | 'done'
  const [dest, setDest]       = useState('/dashboard/student');
  const [phone, setPhone]     = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    async function handle() {
      const token = params.get('token');
      const next  = params.get('next') || '';
      const error = params.get('error');

      if (error || !token) {
        navigate(`/login${error && error !== 'cancelled' ? `?error=${error}` : ''}`, { replace: true });
        return;
      }

      const decoded = parseJwt(token);
      await loginWithToken(token, decoded ? { ...decoded } : null);

      // Fetch full user to check for phone
      try {
        const { data: user } = await api.get('/auth/me');
        const destination = next || (user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student');
        if (!user.phone) {
          setDest(destination);
          setStep('phone');
        } else {
          navigate(destination, { replace: true });
        }
      } catch {
        navigate(next || '/dashboard/student', { replace: true });
      }
    }
    handle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    if (phone.trim()) {
      setSaving(true);
      try { await api.put('/account', { phone: phone.trim() }); } catch {}
    }
    navigate(dest, { replace: true });
  }

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
