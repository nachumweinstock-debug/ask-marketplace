// Central category config — every place that renders a category pill should use this

export const CATEGORY_MAP = {
  tutor: {
    label: 'Instructor',
    emoji: '📚',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  'hebrew tutor': {
    label: 'Hebrew Instructor',
    emoji: '✡️',
    color: '#047857',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  barber: {
    label: 'Barber',
    emoji: '✂️',
    color: '#6D28D9',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  fitness: {
    label: 'Fitness',
    emoji: '🏃',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  // legacy alias
  tennis: {
    label: 'Fitness',
    emoji: '🏃',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  other: {
    label: 'Other',
    emoji: '💡',
    color: '#4B5563',
    bg: '#F3F4F6',
    border: '#D1D5DB',
  },
};

/** Returns the display config for any category string (built-in or custom). */
export function getCategoryConfig(category, customCategory) {
  const key = (category || '').toLowerCase();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  // Custom category: show as-is with a default teal style
  const label = customCategory || category || 'Other';
  return {
    label,
    emoji: '⭐',
    color: '#0369A1',
    bg: '#F0F9FF',
    border: '#BAE6FD',
  };
}
