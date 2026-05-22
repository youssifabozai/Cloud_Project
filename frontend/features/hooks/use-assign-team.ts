'use client';

import { useCallback, useMemo, useState } from 'react';

import { normalizeApiError } from '../api/errors';
import { usersService } from '@/services';

export interface AssignTeamResult {
  userId: string;
  teamId: string;
  message: string;
}

export interface UseAssignTeamState {
  isSaving: boolean;
  error: string | null;
  result: AssignTeamResult | null;
  assignTeam: (userId: string, teamId: string) => Promise<AssignTeamResult>;
  reset: () => void;
}

export function useAssignTeam(): UseAssignTeamState {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssignTeamResult | null>(null);

  const assignTeam = useCallback(async (userId: string, teamId: string) => {
    setIsSaving(true);
    setError(null);
    setResult(null);

    try {
      const response = await usersService.assignTeam(userId, teamId);
      const payload = response.data;
      const nextResult = { userId, teamId, message: payload.message };
      setResult(nextResult);
      return nextResult;
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized.message || 'Failed to assign team');
      throw normalized;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setIsSaving(false);
  }, []);

  return useMemo(
    () => ({ isSaving, error, result, assignTeam, reset }),
    [isSaving, error, result, assignTeam, reset],
  );
}