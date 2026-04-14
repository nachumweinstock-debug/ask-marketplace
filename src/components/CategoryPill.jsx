import { getCategoryConfig } from '../lib/categories';

/** size: 'sm' | 'md' */
export default function CategoryPill({ category, customCategory, subcategory, size = 'sm' }) {
  const cfg = getCategoryConfig(category, customCategory);
  // subcategory takes priority as the display label, then customCategory, then built-in label
  const label = subcategory || customCategory || cfg.label;
  const pad = size === 'md' ? '4px 13px' : '2px 10px';
  const fs = size === 'md' ? 12 : 11;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: fs, fontWeight: 600,
      padding: pad, borderRadius: 999,
      letterSpacing: '0.1px',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: fs + 1 }}>{cfg.emoji}</span>
      {label}
    </span>
  );
}

/** Only renders for zoom or both — in-person is the default and needs no badge */
export function SessionTypePill({ sessionType }) {
  if (!sessionType || sessionType === 'in-person') return null;
  if (sessionType === 'zoom') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
        whiteSpace: 'nowrap',
      }}>
        💻 Zoom
      </span>
    );
  }
  // both
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE',
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
      whiteSpace: 'nowrap',
    }}>
      🔀 Zoom & in-person
    </span>
  );
}
