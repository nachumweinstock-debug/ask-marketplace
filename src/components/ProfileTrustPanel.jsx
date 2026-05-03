import TrustBadges from './TrustBadges';

function dateLabel(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default function ProfileTrustPanel({ provider }) {
  const trust = provider?.trust || {};
  return (
    <section className="card" style={{ padding: 20, borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Trust signals
          </div>
          <TrustBadges trust={trust} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <Metric label="Joined" value={dateLabel(trust.joined_at)} />
        <Metric label="Completed" value={trust.completed_sessions || 0} />
        <Metric label="Response" value={`${trust.response_rate || 0}%`} />
        <Metric label="Avg response" value={trust.average_response_time || 'Not enough data'} />
        <Metric label="Repeat students" value={`${trust.repeat_student_percentage || 0}%`} />
        <Metric label="Saved" value={trust.saved_count || 0} />
        <Metric label="Last active" value={trust.last_active_at ? dateLabel(trust.last_active_at) : 'Recently'} />
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '11px 12px', background: '#fff' }}>
      <div style={{ fontSize: 10.5, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>{value}</div>
    </div>
  );
}
