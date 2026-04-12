// Resolves an avatar/upload path to a full URL.
// In dev, VITE_API_URL is unset so paths like /uploads/xxx are proxied by Vite.
// In prod, VITE_API_URL = 'https://backend.railway.app/api' so we strip /api
// and prefix the path so it points at the Railway server, not Vercel.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}
