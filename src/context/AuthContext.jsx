import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('ask_token');
    const savedUser = localStorage.getItem('ask_user');
    if (saved && savedUser) {
      setToken(saved);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  function login(token, user) {
    setToken(token);
    setUser(user);
    localStorage.setItem('ask_token', token);
    localStorage.setItem('ask_user', JSON.stringify(user));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ask_token');
    localStorage.removeItem('ask_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
