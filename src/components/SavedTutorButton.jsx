import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function SavedTutorButton({ tutorId, initialSaved = false, onChange, compact = false }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(!!initialSaved);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSaved(!!initialSaved);
  }, [initialSaved]);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${next}`;
      return;
    }
    setLoading(true);
    try {
      if (saved) {
        await api.delete(`/saved-tutors/${tutorId}`);
        setSaved(false);
        onChange?.(false);
      } else {
        await api.post(`/saved-tutors/${tutorId}`);
        setSaved(true);
        onChange?.(true);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update saved instructors');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? 'Remove saved instructor' : 'Save instructor'}
      title={saved ? 'Remove saved instructor' : 'Save instructor'}
      style={{
        height: compact ? 34 : 38,
        minWidth: compact ? 34 : 38,
        borderRadius: 999,
        border: `1.5px solid ${saved ? '#FBCFE8' : 'rgba(255,255,255,0.7)'}`,
        background: saved ? '#FDF2F8' : 'rgba(255,255,255,0.92)',
        color: saved ? '#DB2777' : 'var(--text)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 0 : 7,
        padding: compact ? 0 : '0 14px',
        cursor: loading ? 'wait' : 'pointer',
        fontSize: 12.5,
        fontWeight: 800,
        fontFamily: 'var(--font-ui)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}
    >
      <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
      {!compact && (saved ? 'Saved' : 'Save')}
    </button>
  );
}
