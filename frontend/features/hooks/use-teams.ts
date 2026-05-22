'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { normalizeApiError } from '../api/errors';
import { teamsService } from '@/services';

import type { Team } from '@/services/teams.service';

export interface UseTeamsState {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTeams(): UseTeamsState {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await teamsService.getAll();
      setTeams(response);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setTeams([]);
      setError(normalized.message || 'Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({ teams, isLoading, error, refresh }),
    [teams, isLoading, error, refresh],
  );
}
