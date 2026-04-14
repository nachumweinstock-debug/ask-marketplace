import axios from 'axios';
import { supabase } from './lib/supabase';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use(async (config) => {
  // Our own JWT takes priority over Supabase
  const local = localStorage.getItem('ask_token');
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
      try {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.access_token) {
          error.config.headers.Authorization = `Bearer ${session.access_token}`;
          return api.request(error.config);
        }
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default api;
