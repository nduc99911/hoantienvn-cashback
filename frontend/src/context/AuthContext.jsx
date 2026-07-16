import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      async login(email, password) {
        const d = await authApi.login(email, password);
        localStorage.setItem('token', d.token);
        setUser(d.user);
        return d.user;
      },
      async register(payload) {
        const d = await authApi.register(payload);
        localStorage.setItem('token', d.token);
        setUser(d.user);
        return d.user;
      },
      logout() {
        localStorage.removeItem('token');
        setUser(null);
      },
      async refresh() {
        const d = await authApi.me();
        setUser(d.user);
        return d.user;
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
