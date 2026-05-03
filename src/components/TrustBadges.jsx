export default function TrustBadges({ trust, compact = false }) {
  const labels = trust?.labels || trust?.trust_labels || [];
  if (!labels.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {labels.slice(0, compact ? 2 : 5).map((label) => (
        <span key={label} style={{
          fontSize: compact ? 10.5 : 11.5,
          fontWeight: 900,
          letterSpacing: '0.02em',
          color: '#064E3B',
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: 999,
          padding: compact ? '2px 7px' : '4px 9px',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      ))}
    </div>
  );
}
