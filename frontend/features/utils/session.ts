import type { Session } from '@/types';

import type { CurrentUserResponse, UserSession } from '../types';
import { normalizeUserRole } from './role';

export const USER_SESSION_STORAGE_KEYS = ['accessToken', 'authToken', 'token'] as const;
export const USER_ROLE_STORAGE_KEYS = ['userRole', 'role'] as const;

function readFromStorage(keys: readonly string[]): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storages = [window.localStorage, window.sessionStorage];

  for (const storage of storages) {
    for (const key of keys) {
      const value = storage.getItem(key);
      if (value && value.trim()) {
        return value;
      }
    }
  }

  return null;
}

function clearFromStorage(keys: readonly string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  const storages = [window.localStorage, window.sessionStorage];

  for (const storage of storages) {
    for (const key of keys) {
      storage.removeItem(key);
    }
  }
}

export function getStoredAccessToken(): string | null {
  return readFromStorage(USER_SESSION_STORAGE_KEYS);
}

export function getStoredUserRole() {
  return normalizeUserRole(readFromStorage(USER_ROLE_STORAGE_KEYS));
}

export function clearStoredUserSession(): void {
  clearFromStorage(USER_SESSION_STORAGE_KEYS);
  clearFromStorage(USER_ROLE_STORAGE_KEYS);
}

export function mapCurrentUserToSession(user: CurrentUserResponse): UserSession {
  const role = normalizeUserRole(user.role) ?? 'EMPLOYEE';

  return {
    userId: user.userId,
    name: user.profile.fullName ?? user.profile.name ?? user.email.split('@')[0],
    email: user.email,
    role,
    teamId: user.teamId ?? '',
    accessToken: user.accessToken,
    idToken: user.idToken,
    profile: {
      ...user.profile,
      role,
      teamId: user.teamId ?? user.profile.teamId ?? '',
    },
    mode: 'api',
  };
}

export function hasStoredUserSession(): boolean {
  return Boolean(getStoredAccessToken());
}

export async function logoutUserSession(remoteLogout?: () => Promise<void> | void): Promise<void> {
  try {
    await remoteLogout?.();
  } catch {
    // Best-effort logout. Local session cleanup still runs.
  } finally {
    clearStoredUserSession();
  }
}

export function sessionFromCurrentUser(user: CurrentUserResponse): Session {
  const session = mapCurrentUserToSession(user);
  return session;
}
