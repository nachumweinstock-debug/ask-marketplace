const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}
