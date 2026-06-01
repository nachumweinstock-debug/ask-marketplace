import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function JoinReferral() {
  const { referralCode } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = String(referralCode || '').trim().toUpperCase();
    if (code) {
      try { localStorage.setItem('pendingReferral', code); } catch {}
    }
    navigate(`/signup${code ? `?ref=${encodeURIComponent(code)}` : ''}`, { replace: true });
  }, [navigate, referralCode]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#FAF7F2] px-4">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1B3A6B] border-t-transparent" />
    </div>
  );
}
