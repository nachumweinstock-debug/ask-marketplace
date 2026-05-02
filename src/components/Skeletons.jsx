export function TutorCardSkeleton() {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="skeleton-shimmer" style={{ height: 200 }} />
      <div style={{ padding: 16 }}>
        <div className="skeleton-shimmer" style={{ width: '35%', height: 10, borderRadius: 6, marginBottom: 10 }} />
        <div className="skeleton-shimmer" style={{ width: '75%', height: 18, borderRadius: 8, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ width: '100%', height: 12, borderRadius: 6, marginBottom: 6 }} />
        <div className="skeleton-shimmer" style={{ width: '60%', height: 12, borderRadius: 6, marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="skeleton-shimmer" style={{ width: 30, height: 30, borderRadius: '50%' }} />
          <div className="skeleton-shimmer" style={{ width: 90, height: 12, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="skeleton-shimmer" style={{ width: 90, height: 16, borderRadius: 8, marginBottom: 20 }} />
      <div className="card" style={{ overflow: 'hidden', borderRadius: 20 }}>
        <div className="skeleton-shimmer" style={{ height: 200 }} />
        <div style={{ padding: 28 }}>
          <div style={{ display: 'flex', gap: 18 }}>
            <div className="skeleton-shimmer" style={{ width: 72, height: 72, borderRadius: '50%', marginTop: -48 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-shimmer" style={{ width: '45%', height: 30, borderRadius: 10, marginBottom: 12 }} />
              <div className="skeleton-shimmer" style={{ width: '68%', height: 14, borderRadius: 8, marginBottom: 10 }} />
              <div className="skeleton-shimmer" style={{ width: '90%', height: 14, borderRadius: 8, marginBottom: 8 }} />
              <div className="skeleton-shimmer" style={{ width: '70%', height: 14, borderRadius: 8 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RowSkeleton({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 18 }}>
          <div className="skeleton-shimmer" style={{ width: '42%', height: 15, borderRadius: 8, marginBottom: 10 }} />
          <div className="skeleton-shimmer" style={{ width: '70%', height: 12, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}
