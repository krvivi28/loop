import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

type Status = 'loading' | 'anon' | 'authed';
interface AuthValue {
  status: Status;
  user: User | null;
  setUser: (u: User) => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    api
      .get<{ user: User }>('/me')
      .then((r) => {
        setUserState(r.user);
        setStatus('authed');
      })
      .catch(() => setStatus('anon'));
    const onUnauthorized = () => {
      setUserState(null);
      setStatus('anon');
    };
    window.addEventListener('fitstack:unauthorized', onUnauthorized);
    return () => window.removeEventListener('fitstack:unauthorized', onUnauthorized);
  }, []);

  const setUser = useCallback((u: User) => {
    setUserState(u);
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUserState(null);
    setStatus('anon');
  }, []);

  return <Ctx.Provider value={{ status, user, setUser, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
