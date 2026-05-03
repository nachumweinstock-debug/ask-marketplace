import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import TrustBadges from '../components/TrustBadges';
import { RowSkeleton } from '../components/Skeletons';

export default function ProviderAnalytics() {
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/providers/me/profile')
      .then(async ({ data: p }) => {
        setProfile(p);
        const r = await api.get(`/trust/provider/${p.id}/analytics`);
        setData(r.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page" style={{ maxWidth: 1040 }}><RowSkeleton rows={5} /></div>;
  if (!profile) return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>No provider listing yet</h1>
        <Link to="/create-listing" style={{ color: 'var(--primary)', fontWeight: 800 }}>Create a listing</Link>
      </div>
    </div>
  );

  const kpis = data?.kpis || {};
  const trust = data?.trust || profile.trust || {};
  const weeks = data?.bookings_by_week || [];
  const maxBookings = Math.max(1, ...weeks.map(w => w.bookings || 0));

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div className="section-label">Provider analytics</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, lineHeight: 1, marginTop: 8 }}>Your marketplace performance</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>Views, bookings, trust, repeat students, and saves.</p>
        </div>
        <Link to="/dashboard/provider" style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '9px 16px', textDecoration: 'none', color: 'var(--text)', fontWeight: 800 }}>
          Back to dashboard
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Kpi label="Profile views" value={kpis.profile_views || 0} />
        <Kpi label="Card clicks" value={kpis.listing_clicks || 0} />
        <Kpi label="Booking conversion" value={`${kpis.booking_conversion_rate || 0}%`} />
        <Kpi label="Completed sessions" value={kpis.sessions_completed || 0} />
        <Kpi label="Repeat students" value={kpis.repeat_students || 0} />
        <Kpi label="Saved by students" value={kpis.saved_count || 0} />
        <Kpi label="Response rate" value={`${kpis.response_rate || 0}%`} />
        <Kpi label="Est. earnings" value={`$${kpis.earnings_estimate || 0}`} />
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>Bookings by week</h2>
          <TrustBadges trust={trust} />
        </div>
        {weeks.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>No bookings yet. Add availability and keep your profile sharp.</p>
        ) : (
          <div style={{ height: 220, display: 'flex', alignItems: 'end', gap: 10 }}>
            {weeks.map(row => (
              <div key={row.week} style={{ flex: 1, minWidth: 34, textAlign: 'center' }}>
                <div style={{
                  height: `${Math.max(10, (row.bookings / maxBookings) * 190)}px`,
                  background: 'linear-gradient(180deg,#22C55E,#14532D)',
                  borderRadius: '10px 10px 4px 4px',
                }} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 7 }}>{row.week}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 12 }}>Trust breakdown</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <Kpi label="Avg response" value={trust.average_response_time || 'Not enough data'} />
          <Kpi label="Cancellation rate" value={`${trust.cancellation_rate || 0}%`} />
          <Kpi label="Repeat student %" value={`${trust.repeat_student_percentage || 0}%`} />
          <Kpi label="Average rating" value={trust.average_review_rating || 'No reviews'} />
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="card" style={{ padding: 18, borderRadius: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginTop: 6, color: 'var(--text)' }}>{value}</div>
    </div>
  );
}
