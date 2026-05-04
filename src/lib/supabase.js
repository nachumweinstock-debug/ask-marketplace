import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const disabledAuth = {
  auth: {
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async getSession() {
      return { data: { session: null }, error: null };
    },
    async refreshSession() {
      return { data: { session: null }, error: null };
    },
    async signOut() {
      return { error: null };
    },
  },
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : disabledAuth;
