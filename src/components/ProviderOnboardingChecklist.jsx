export default function ProviderOnboardingChecklist({ profile, availability = [], reviews = [] }) {
  const checks = [
    ['Upload profile photo', !!profile?.avatar_url],
    ['Verify school', !!profile?.school_verified || !!profile?.college],
    ['Complete bio', (profile?.bio || '').length >= 80],
    ['Create first listing', !!profile?.id],
    ['Add availability', availability.length > 0],
    ['Connect payment method', !!profile?.venmo || !!profile?.zelle],
    ['Receive first review', reviews.length > 0 || profile?.review_count > 0],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  const pct = Math.round((done / checks.length) * 100);
  const next = checks.find(([, ok]) => !ok)?.[0] || 'Keep your availability fresh';
  return (
    <section className="card" style={{ padding: 20, borderRadius: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Provider setup</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginTop: 4 }}>{pct}% complete</h2>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>Next: <strong style={{ color: 'var(--text)' }}>{next}</strong></div>
      </div>
      <div style={{ height: 9, background: 'var(--gray-100)', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#16A34A,#0F766E)', borderRadius: 999 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
        {checks.map(([label, ok]) => (
          <div key={label} style={{ fontSize: 12.5, fontWeight: 800, color: ok ? '#166534' : 'var(--muted)' }}>
            {ok ? '✓' : '○'} {label}
          </div>
        ))}
      </div>
    </section>
  );
}
