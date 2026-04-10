// Custom SVG icons not in lucide

export function MagenDavid({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Triangle pointing up */}
      <polygon points="12,3 22,20 2,20" />
      {/* Triangle pointing down */}
      <polygon points="12,21 2,4 22,4" />
    </svg>
  );
}

export function TennisRacket({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Racket head — ellipse */}
      <ellipse cx="10" cy="9" rx="7" ry="8" />
      {/* Strings horizontal */}
      <line x1="3.5" y1="7" x2="16.5" y2="7" />
      <line x1="3.2" y1="10" x2="16.8" y2="10" />
      {/* Strings vertical */}
      <line x1="8"  y1="1.4" x2="8"  y2="16.6" />
      <line x1="12" y1="1.4" x2="12" y2="16.6" />
      {/* Handle */}
      <line x1="15" y1="15" x2="21" y2="21" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
