import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ProviderCard from '../components/ProviderCard';
import { TutorCardSkeleton } from '../components/Skeletons';

export default function SavedTutors() {
  const { user } = useAuth();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(!!user);

  useEffect(() => {
    if (!user) return;
    api.get('/saved-tutors')
      .then(({ data }) => setTutors(data))
      .catch(() => setTutors([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  function handleSavedChange(id, saved) {
    if (!saved) setTutors(items => items.filter(item => item.id !== id));
  }

  if (!user) {
    return (
      <div className="page" style={{ maxWidth: 680 }}>
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, marginBottom: 10 }}>Save tutors for later</h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 24 }}>
            Log in to save tutors, compare profiles, and build a shortlist before you book.
          </p>
          <Link to="/login?redirect=/saved-tutors" style={{ display: 'inline-block', background: 'var(--text)', color: '#fff', borderRadius: 999, padding: '11px 24px', fontWeight: 800, textDecoration: 'none' }}>
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 7vw, 64px)', lineHeight: 0.96, color: 'var(--text)', marginBottom: 8 }}>
            Saved tutors
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>{loading ? 'Loading your shortlist...' : `${tutors.length} saved profile${tutors.length === 1 ? '' : 's'}`}</p>
        </div>
        <Link to="/browse" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 800, fontSize: 13 }}>
          Browse more
        </Link>
      </div>

      {loading ? (
        <div className="provider-grid">
          {Array.from({ length: 4 }).map((_, i) => <TutorCardSkeleton key={i} />)}
        </div>
      ) : tutors.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>No saved tutors yet</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Tap the heart on tutor cards or profiles to save them here.</p>
          <Link to="/browse" style={{ display: 'inline-block', background: 'var(--text)', color: '#fff', borderRadius: 999, padding: '10px 22px', fontWeight: 800, textDecoration: 'none' }}>
            Find tutors
          </Link>
        </div>
      ) : (
        <div className="provider-grid">
          {tutors.map(tutor => (
            <ProviderCard key={tutor.id} provider={tutor} saved onSavedChange={handleSavedChange} />
          ))}
        </div>
      )}
    </div>
  );
}
