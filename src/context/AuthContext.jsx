import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import api from '../api';

const AuthContext = createContext(null);
const SUPERADMINS = ['nachumweinstock@gmail.com'];

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

function writeToken(token) {
  try {
    localStorage.setItem('ask_token', token);
  } catch {
    // Keep the in-memory user active even if persistent storage fails.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user from our backend using whatever token is current
  const syncUser = useCallback(async (keepExisting = false) => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch (err) {
      // If our token is expired/invalid, clear it so the user is treated as logged out
      if (err.response?.status === 401) {
        clearToken();
      }
      if (!keepExisting) setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Our own JWT in localStorage
    const localToken = readToken();
    if (localToken) {
      syncUser();
      return;
    }

    // 2. Legacy Supabase session (existing users before the migration)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        syncUser();
      } else if (!readToken()) {
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

  // Called after our own login/verify to store token and set user.
  // skipMe: pass true when the caller will fetch /auth/me itself (e.g. AuthCallback).
  async function loginWithToken(token, userData, { skipMe = false } = {}) {
    writeToken(token);
    setUser(userData); // set immediately so navigation works right away
    if (!skipMe) {
      // Replace with full record (includes is_admin, provider_profile_id, etc.)
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
      } catch { /* leave userData in place */ }
    }
  }

  async function refreshUser() {
    await syncUser(true);
  }

  async function signOut() {
    clearToken();
    setUser(null);
    // Also sign out of Supabase in case they were a legacy user
    try { await supabase.auth.signOut(); } catch {
      // Legacy Supabase signout is best-effort only.
    }
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
