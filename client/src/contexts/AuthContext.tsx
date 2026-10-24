import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  establishCsrf,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  updateProfile as updateProfileRequest,
} from '../services/auth';
import type { AuthUser } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'customer') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      try {
        await establishCsrf();
        setUser(await getCurrentUser());
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        await establishCsrf();
        setUser(await loginRequest(email, password));
      },
      register: async (name, email, password, role) => {
        await establishCsrf();
        setUser(await registerRequest(name, email, password, role));
      },
      logout: async () => {
        await logoutRequest();
        setUser(null);
      },
      updateProfile: async (name) => {
        setUser(await updateProfileRequest(name));
      },
    }),
    [user, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
