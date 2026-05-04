import axios from 'axios';
import { supabase } from './lib/supabase';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

function readToken() {
  try {
    return localStorage.getItem('ask_token');
  } catch {
    return null;
  }
}

function clearToken() {
  try {
    localStorage.removeItem('ask_token');
  } catch {
    // Storage can be unavailable in locked-down browsers.
  }
}

api.interceptors.request.use(async (config) => {
  // Our own JWT takes priority over Supabase
  const local = readToken();
  if (local) {
    config.headers.Authorization = `Bearer ${local}`;
    return config;
  }
  // Legacy: fall back to Supabase session for existing logged-in users
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;

      // If we have our own JWT, it's expired/invalid — clear it immediately
      const ourToken = readToken();
      if (ourToken) {
        clearToken();
        // Redirect to login unless we're already on an auth page
        const onAuthPage = /^\/(login|signup|forgot-password)/.test(window.location.pathname);
        if (!onAuthPage) window.location.href = '/login';
        return Promise.reject(error);
      }

      // Legacy: try to refresh Supabase session for old accounts
      try {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.access_token) {
          error.config.headers.Authorization = `Bearer ${session.access_token}`;
          return api.request(error.config);
        }
      } catch {
        // Legacy Supabase refresh is best-effort only.
      }
    }
    return Promise.reject(error);
  }
);

export default api;
