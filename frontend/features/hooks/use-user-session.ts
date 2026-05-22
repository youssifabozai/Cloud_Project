'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchCurrentUser } from '../api/current-user';
import { normalizeApiError } from '../api/errors';
import type { UserSessionState } from '../types/user.types';
import { getSessionAccessReason } from '../utils/route-protection';
import { logoutUserSession, mapCurrentUserToSession } from '../utils/session';

type UnauthorizedReason = Extract<UserSessionState, { status: 'unauthorized' | 'forbidden' }>['reason'];

function buildUnauthorizedState(reason: UnauthorizedReason, error?: string): UserSessionState {
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
    try {
      const currentUser = await fetchCurrentUser();
      setState({
        status: 'authenticated',
        session: mapCurrentUserToSession(currentUser),
      });
    } catch (error) {
      const normalizedError = normalizeApiError(error);
      const sessionReason = getSessionAccessReason(normalizedError.status);
      const reason: UnauthorizedReason = sessionReason === 'unknown' ? 'missing_token' : sessionReason;

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
