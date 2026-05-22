'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { logoutUserSession } from '../utils/session';

export function useUserLogout(remoteLogout?: () => Promise<void> | void, loginPath = '/login') {
  const router = useRouter();

  return useCallback(async () => {
    await logoutUserSession(remoteLogout);
    router.replace(loginPath);
  }, [loginPath, remoteLogout, router]);
}