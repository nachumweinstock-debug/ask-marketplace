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

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

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
          {done ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E', marginBottom: 8 }}>
                Password updated
              </div>
              <div style={{ fontSize: 13, color: '#64748B' }}>Redirecting you to login...</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>Set new password</div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 20 }}>Choose something you'll remember.</div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', marginBottom: 5, display: 'block' }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} required minLength={6}
                      placeholder="At least 6 characters" value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ ...INPUT, paddingRight: 36 }} />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#64748B', marginBottom: 5, display: 'block' }}>
                    Confirm Password
                  </label>
                  <input type="password" required placeholder="Repeat password" value={confirm}
                    onChange={e => setConfirm(e.target.value)} style={INPUT} />
                </div>
                {error && (
                  <div style={{ background: '#FFF0F0', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{
                  width: '100%', background: loading ? '#93C5FD' : BLUE, color: '#fff',
                  border: 'none', borderRadius: 8, padding: '11px', fontSize: 13,
                  fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 6,
                }}>
                  {loading ? 'Saving...' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
