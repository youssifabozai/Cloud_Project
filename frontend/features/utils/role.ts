import type { UserRole } from '@/types';

export function normalizeUserRole(role?: string | null): UserRole | null {
  if (!role) {
    return null;
  }

  const normalized = role.trim().toUpperCase();

  if (normalized === 'ADMIN' || normalized === 'MANAGER' || normalized === 'EMPLOYEE') {
    return normalized;
  }

  return null;
}

export function isAdmin(role?: string | null): boolean {
  return normalizeUserRole(role) === 'ADMIN';
}

export function isManager(role?: string | null): boolean {
  return normalizeUserRole(role) === 'MANAGER';
}

export function isEmployee(role?: string | null): boolean {
  return normalizeUserRole(role) === 'EMPLOYEE';
}

export function canAccessWithRole(role: string | null | undefined, allowedRoles: UserRole[]): boolean {
  const normalizedRole = normalizeUserRole(role ?? null);
  return normalizedRole ? allowedRoles.includes(normalizedRole) : false;
}