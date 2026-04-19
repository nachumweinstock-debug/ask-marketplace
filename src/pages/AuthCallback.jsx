import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Decode JWT payload without verification (fine — we just need the role for redirect)
function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
  catch { return null; }
}

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function handle() {
      const token = params.get('token');
      const next  = params.get('next') || '';
      const error = params.get('error');

      if (error || !token) {
        const msg = error === 'cancelled' ? '' : error ? `?error=${error}` : '';
        navigate(`/login${msg}`, { replace: true });
        return;
      }

      const decoded = parseJwt(token);
      await loginWithToken(token, decoded ? { ...decoded } : null);

      const dest = next || (decoded?.role === 'provider' ? '/dashboard/provider' : '/dashboard/student');
      navigate(dest, { replace: true });
    }
    handle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)',
    }}>
      <div style={{
        width: 28, height: 28,
        border: '2px solid var(--primary)', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}
