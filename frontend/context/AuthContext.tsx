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
import type { Session, AppMode, UserRole, UserProfile } from '@/types';
import { authService, MOCK_USERS } from '@/services';
import { clearStoredUserSession, logoutUserSession, mapCurrentUserToSession } from '@/features/utils';

// ─────────────────────────────────────────────────────────────
//  Context Shape
// ─────────────────────────────────────────────────────────────
interface AuthContextValue {
  /* state */
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mode: AppMode;

  /* derived helpers */
  isManager: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isLeader: boolean;          // manager OR admin
  userRole: UserRole | null;
  teamId: string;

  /* actions */
  loginApi: (email: string, password: string) => Promise<void>;
  loginMock: (userId: string) => void;
  register: (opts: { email: string; password: string; fullName: string; role: UserRole; team: string }) => Promise<void>;
  logout: () => void;
  switchUser: (userId: string) => void;   // dev-sandbox quick-switch
  setMode: (m: AppMode) => void;
  setTheme: (t: 'dark' | 'light') => void;
  refreshSession: () => Promise<void>;
  theme: 'dark' | 'light';
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// No localStorage: cookie-only auth and in-memory dev mocks

// ─── Public paths that don't need auth ────────────────────────
const PUBLIC_PATHS = ['/', '/login', '/register'];

// ─────────────────────────────────────────────────────────────
//  Provider
// ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setModeState] = useState<AppMode>('mock');
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [customUsers, setCustomUsers] = useState<UserProfile[]>([]);
  const allUsers = useMemo(() => [...MOCK_USERS, ...customUsers], [customUsers]);

  // Cookie helpers for theme persistence (plain cookie, not HttpOnly)
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

  // ── Restore session on mount ────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Always try server-side cookie session first
        try {
          const res = await authService.getSession();
          if (res && mounted) {
            const s = mapCurrentUserToSession(res);
            setModeState('api');
            setSession(s);
          }
        } catch {
          // no server session available — will remain in mock mode
        }
        // Restore theme from cookie if present
        const storedTheme = readCookie('mj_theme');
        if (storedTheme === 'light' || storedTheme === 'dark') {
          setThemeState(storedTheme);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Sync theme class on <html> ──────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Persist theme to a plain cookie so UI preference survives sessions
    writeCookie('mj_theme', theme, 365);
  }, [theme]);

  // ── Redirect unauthenticated users ──────────────────────────
  useEffect(() => {
    if (isLoading) return;
    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith('/login') || pathname.startsWith('/register'),
    );
    if (!session && !isPublic) {
      router.replace('/login');
    }
  }, [session, isLoading, pathname, router]);

  // ── Persist helper ──────────────────────────────────────────
  const persist = useCallback((s: Session) => {
    setSession(s);
  }, []);

  // ── API Login ───────────────────────────────────────────────
  const loginApi = useCallback(async (email: string, password: string) => {
    const data = await authService.login({ email, password });
    const u = data.user || {};
    const s: Session = {
      userId: u.sub || `user-${Date.now()}`,
      name: u.fullName || email.split('@')[0],
      email: u.email,
      role: (u.role || 'EMPLOYEE').toUpperCase() as UserRole,
      teamId: u.team || '',
      profile: {
        userId: u.sub || `user-${Date.now()}`,
        name: u.fullName || email.split('@')[0],
        email: u.email || email,
        role: (u.role || 'EMPLOYEE').toUpperCase() as UserRole,
        teamId: u.team || '',
        fullName: u.fullName || email.split('@')[0],
      },
      mode: 'api',
    };
    setModeState('api');
    persist(s);
    router.push('/dashboard');
  }, [persist, router]);

  const refreshSession = useCallback(async () => {
    try {
      const res = await authService.getSession();
      if (!res) {
        setSession(null);
        return;
      }

      setModeState('api');
      setSession(mapCurrentUserToSession(res));
    } catch {
      setSession(null);
    }
  }, []);

  // ── Mock Login ──────────────────────────────────────────────
  const loginMock = useCallback((userId: string) => {
    const u = allUsers.find((user) => user.userId === userId) || MOCK_USERS[0];
    const s: Session = {
      userId: u.userId,
      name: u.name || u.fullName || 'User',
      email: u.email,
      role: (u.role || 'EMPLOYEE').toUpperCase() as UserRole,
      teamId: u.teamId || '',
      profile: {
        userId: u.userId,
        name: u.name || u.fullName || 'User',
        email: u.email,
        role: (u.role || 'EMPLOYEE').toUpperCase() as UserRole,
        teamId: u.teamId || '',
        fullName: u.fullName || u.name || 'User',
      },
      mode: 'mock',
    };
    setModeState('mock');
    persist(s);
    router.push('/dashboard');
  }, [allUsers, persist, router]);

  // ── Register ────────────────────────────────────────────────
  const register = useCallback(
    async (opts: { email: string; password: string; fullName: string; role: UserRole; team: string }) => {
      if (mode === 'api') {
        await authService.createUser({
          email: opts.email,
          password: opts.password,
          fullName: opts.fullName,
          role: opts.role,
          team: opts.team,
        });
        router.push('/login');
      } else {
        // Mock register
        const newUser: UserProfile = {
          userId: `user-${Date.now()}`,
          name: opts.fullName,
          fullName: opts.fullName,
          email: opts.email,
          role: opts.role,
          teamId: opts.role === 'MANAGER' || opts.role === 'ADMIN' ? '' : opts.team,
        };
        setCustomUsers((prev) => [...prev, newUser]);

        const s: Session = {
          userId: newUser.userId,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          teamId: newUser.teamId,
          profile: {
            userId: newUser.userId,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            teamId: newUser.teamId,
            fullName: newUser.fullName,
          },
          mode: 'mock',
        };
        persist(s);
        router.push('/dashboard');
      }
    },
    [mode, persist, router],
  );

  // ── Logout ──────────────────────────────────────────────────
  const logout = useCallback(() => {
    if (mode === 'api') {
      void logoutUserSession(async () => {
        await authService.logout();
      });
    } else {
      clearStoredUserSession();
    }
    setSession(null);
    router.push('/login');
  }, [mode, router]);

  // ── Quick-Switch (dev sandbox) ──────────────────────────────
  const switchUser = useCallback((userId: string) => {
    const u = allUsers.find((user) => user.userId === userId);
    if (!u) return;
    const s: Session = {
      userId: u.userId,
      name: u.name || u.fullName || 'User',
      email: u.email,
      role: (u.role || 'EMPLOYEE').toUpperCase() as UserRole,
      teamId: u.teamId || '',
      profile: {
        userId: u.userId,
        name: u.name || u.fullName || 'User',
        email: u.email,
        role: (u.role || 'EMPLOYEE').toUpperCase() as UserRole,
        teamId: u.teamId || '',
        fullName: u.fullName || u.name || 'User',
      },
      mode: session?.mode || 'mock',
    };
    persist(s);
  }, [allUsers, persist, session]);

  const setMode = useCallback((m: AppMode) => {
    setModeState(m);
    if (session) {
      persist({ ...session, mode: m });
    }
  }, [session, persist]);

  const setTheme = useCallback((t: 'dark' | 'light') => {
    setThemeState(t);
  }, []);

  // ── Derived values ──────────────────────────────────────────
  const value = useMemo<AuthContextValue>(() => {
    const role = session?.role || null;
    const isMgr = role === 'MANAGER';
    const isAdm = role === 'ADMIN';
    return {
      session,
      isLoading,
      isAuthenticated: !!session,
      mode,
      isManager: isMgr,
      isAdmin: isAdm,
      isEmployee: role === 'EMPLOYEE',
      isLeader: isMgr || isAdm,
      userRole: role,
      teamId: session?.teamId || '',
      loginApi,
      loginMock,
      register,
      logout,
      switchUser,
      setMode,
      setTheme,
      refreshSession,
      theme,
    };
  }, [session, isLoading, mode, theme, loginApi, loginMock, register, logout, switchUser, setMode, setTheme, refreshSession]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;
