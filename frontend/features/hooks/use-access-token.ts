'use client';

import { useEffect, useState } from 'react';

import { getStoredAccessToken } from '../utils/session';

export function useAccessToken() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const syncToken = () => setAccessToken(getStoredAccessToken());

    syncToken();
    window.addEventListener('storage', syncToken);

    return () => {
      window.removeEventListener('storage', syncToken);
    };
  }, []);

  return accessToken;
}