'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchCurrentUser } from '../api/current-user';
import { normalizeApiError } from '../api/errors';
import type { UserSessionState } from '../types/user.types';
import { getSessionAccessReason } from '../utils/route-protection';
import { getStoredAccessToken, logoutUserSession, mapCurrentUserToSession } from '../utils/session';

function buildUnauthorizedState(reason: UserSessionState['reason'], error?: string): UserSessionState {
  return {
    status: reason === 'forbidden_access' ? 'forbidden' : 'unauthorized',
    session: null,
    reason,
    error,
  };
}

export function useUserSession() {
  const [state, setState] = useState<UserSessionState>({
    status: 'loading',
    session: null,
  });

  const bootstrapSession = useCallback(async () => {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
      setState(buildUnauthorizedState('missing_token'));
      return;
    }

    try {
      const currentUser = await fetchCurrentUser();
      setState({
        status: 'authenticated',
        session: mapCurrentUserToSession(currentUser),
      });
    } catch (error) {
      const normalizedError = normalizeApiError(error);
      const reason = getSessionAccessReason(normalizedError.status);

      if (reason === 'expired_token') {
        await logoutUserSession();
      }

      setState(buildUnauthorizedState(reason, normalizedError.message));
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) {
        return;
      }

      await bootstrapSession();
    })();

    return () => {
      mounted = false;
    };
  }, [bootstrapSession]);

  const refresh = useCallback(async () => {
    setState({ status: 'loading', session: null });
    await bootstrapSession();
  }, [bootstrapSession]);

  return {
    ...state,
    isLoading: state.status === 'loading',
    isAuthenticated: state.status === 'authenticated',
    refresh,
  };
}