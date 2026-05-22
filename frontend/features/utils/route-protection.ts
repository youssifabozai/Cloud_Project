import type { UserRole } from '@/types';

import { normalizeUserRole } from './role';
import {
  getStoredAccessToken as readStoredAccessToken,
  getStoredUserRole as readStoredUserRole,
  hasStoredUserSession,
} from './session';

export const DEFAULT_PUBLIC_ROUTES = ['/', '/login', '/register'] as const;

export function getStoredAccessToken(): string | null {
  return readStoredAccessToken();
}

export function getStoredUserRole(): UserRole | null {
  return normalizeUserRole(readStoredUserRole());
}

export function hasStoredAccessToken(): boolean {
  return hasStoredUserSession();
}

export function isProtectedRoute(pathname: string, publicRoutes: readonly string[] = DEFAULT_PUBLIC_ROUTES): boolean {
  const normalizedPath = pathname.trim();
  return !publicRoutes.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`));
}

export function shouldRedirectToLogin(pathname: string, accessToken?: string | null): boolean {
  return isProtectedRoute(pathname) && !accessToken && !hasStoredAccessToken();
}

export function getSessionAccessReason(statusCode?: number): 'missing_token' | 'expired_token' | 'forbidden_access' | 'unknown' {
  if (!statusCode) {
    return 'unknown';
  }

  if (statusCode === 401) {
    return 'expired_token';
  }

  if (statusCode === 403) {
    return 'forbidden_access';
  }

  return 'unknown';
}

export function canRenderForRoles(role: string | null | undefined, allowedRoles: readonly UserRole[]): boolean {
  if (allowedRoles.length === 0) {
    return true;
  }

  const normalizedRole = normalizeUserRole(role);
  return normalizedRole ? allowedRoles.includes(normalizedRole) : false;
}

export function getFallbackRouteForRole(role: string | null | undefined): string {
  const normalizedRole = normalizeUserRole(role);

  if (normalizedRole === 'ADMIN') {
    return '/dashboard';
  }

  if (normalizedRole === 'MANAGER') {
    return '/dashboard';
  }

  return '/dashboard';
}