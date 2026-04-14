import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import api from '../api';

const AuthContext = createContext(null);
const SUPERADMINS = ['nachumweinstock@gmail.com'];

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user from our backend using whatever token is current
  const syncUser = useCallback(async (keepExisting = false) => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      if (!keepExisting) setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Our own JWT in localStorage
    const localToken = localStorage.getItem('ask_token');
    if (localToken) {
      syncUser();
      return;
    }

    // 2. Legacy Supabase session (existing users before the migration)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        syncUser();
      } else if (!localStorage.getItem('ask_token')) {
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        syncUser();
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncUser]);

  // Called after our own login/verify to store token and set user
  function loginWithToken(token, userData) {
    localStorage.setItem('ask_token', token);
    setUser(userData);
  }

  async function refreshUser() {
    await syncUser(true);
  }

  async function signOut() {
    localStorage.removeItem('ask_token');
    setUser(null);
    // Also sign out of Supabase in case they were a legacy user
    try { await supabase.auth.signOut(); } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
