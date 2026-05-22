'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Session, UserRole } from '@/types';
import { authService } from '@/services';
import { clearStoredUserSession, logoutUserSession, mapCurrentUserToSession } from '@/features/utils';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isManager: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isLeader: boolean;
  userRole: UserRole | null;
  teamId: string;
  login: (email: string, password: string) => Promise<void>;
  register: (opts: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    team: string;
  }) => Promise<void>;
  logout: () => void;
  setTheme: (t: 'dark' | 'light') => void;
  refreshSession: () => Promise<void>;
  theme: 'dark' | 'light';
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PUBLIC_PATHS = ['/', '/login', '/register'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  const readCookie = (name: string) => {
    if (typeof document === 'undefined') return undefined;
    const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : undefined;
  };

  const writeCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') return;
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}`;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await authService.getSession();
        if (res && mounted) {
          setSession(mapCurrentUserToSession(res));
        }
        const storedTheme = readCookie('mj_theme');
        if (storedTheme === 'light' || storedTheme === 'dark') {
          setThemeState(storedTheme);
        }
      } catch {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    writeCookie('mj_theme', theme, 365);
  }, [theme]);

  useEffect(() => {
    if (isLoading) return;
    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith('/login') || pathname.startsWith('/register'),
    );
    if (!session && !isPublic) {
      router.replace('/login');
    }
  }, [session, isLoading, pathname, router]);

  const persist = useCallback((s: Session) => {
    setSession(s);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      await authService.login({ email, password });
      const res = await authService.getSession();
      if (!res) {
        throw new Error('Login succeeded but session could not be loaded');
      }
      persist(mapCurrentUserToSession(res));
      router.push('/dashboard');
    },
    [persist, router],
  );

  const refreshSession = useCallback(async () => {
    try {
      const res = await authService.getSession();
      if (!res) {
        setSession(null);
        return;
      }
      setSession(mapCurrentUserToSession(res));
    } catch {
      setSession(null);
    }
  }, []);

  const register = useCallback(
    async (opts: {
      email: string;
      password: string;
      fullName: string;
      role: UserRole;
      team: string;
    }) => {
      await authService.register({
        email: opts.email,
        password: opts.password,
        fullName: opts.fullName,
        role: opts.role,
        team: opts.role === 'EMPLOYEE' ? opts.team : '',
      });
      router.push('/login');
    },
    [router],
  );

  const logout = useCallback(() => {
    void logoutUserSession(async () => {
      await authService.logout();
    });
    setSession(null);
    router.push('/login');
  }, [router]);

  const setTheme = useCallback((t: 'dark' | 'light') => {
    setThemeState(t);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = session?.role || null;
    const isMgr = role === 'MANAGER';
    const isAdm = role === 'ADMIN';
    return {
      session,
      isLoading,
      isAuthenticated: !!session,
      isManager: isMgr,
      isAdmin: isAdm,
      isEmployee: role === 'EMPLOYEE',
      isLeader: isMgr || isAdm,
      userRole: role,
      teamId: session?.teamId || '',
      login,
      register,
      logout,
      setTheme,
      refreshSession,
      theme,
    };
  }, [session, isLoading, theme, login, register, logout, setTheme, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;
