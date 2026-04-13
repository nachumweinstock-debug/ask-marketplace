import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import api from '../api';

const AuthContext = createContext(null);

// Hardwired superadmins — guaranteed admin flag even when backend is unreachable
const SUPERADMINS = ['nachumweinstock@gmail.com'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // keepExisting: if true, a failed API call keeps the current user instead of logging out.
  // Use keepExisting=true for background refreshes (e.g. after saving profile).
  // Use keepExisting=false (default) for the initial auth check on app load.
  const syncUser = useCallback(async (fallbackSession, keepExisting = false) => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      // Backend unreachable — try to stay logged in
      if (fallbackSession?.user) {
        const u = fallbackSession.user;
        const email = u.email?.toLowerCase() || '';
        setUser({
          id: u.id,
          email,
          name: u.user_metadata?.full_name || email.split('@')[0],
          role: 'student',
          is_admin: SUPERADMINS.includes(email) ? 1 : 0,
        });
      } else if (!keepExisting) {
        // Only clear user on initial load failures, not on explicit refreshes
        setUser(null);
      }
      // If keepExisting=true and no fallback, silently retain current user state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        syncUser(session);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncUser]);

  async function refreshUser() {
    await syncUser(undefined, true); // keepExisting — never log out on a background refresh
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, role: user?.role || null, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
