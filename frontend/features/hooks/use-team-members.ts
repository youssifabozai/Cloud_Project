'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { normalizeApiError } from '../api/errors';
import { usersService, teamsService } from '@/services';

import type { Team } from '@/services/teams.service';
import type { UserProfile } from '@/types';

export interface TeamMembersState {
  selectedTeamId: string;
  setSelectedTeamId: (teamId: string) => void;
  teamMembers: UserProfile[];
  teamInfo: Team | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  hasSelection: boolean;
}

export function useTeamMembers(initialTeamId = ''): TeamMembersState {
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId.trim());
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [teamInfo, setTeamInfo] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const teamId = selectedTeamId.trim();

    if (!teamId) {
      setTeamMembers([]);
      setTeamInfo(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [membersResult, teamResult] = await Promise.allSettled([
        usersService.getByTeam(teamId),
        teamsService.getById(teamId),
      ]);

      if (membersResult.status === 'rejected') {
        throw membersResult.reason;
      }

      setTeamMembers(membersResult.value ?? []);
      setTeamInfo(teamResult.status === 'fulfilled' ? teamResult.value : null);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setTeamMembers([]);
      setTeamInfo(null);
      setError(normalized.message || 'Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId]);

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
    () => ({
      selectedTeamId,
      setSelectedTeamId,
      teamMembers,
      teamInfo,
      isLoading,
      error,
      refresh,
      hasSelection: Boolean(selectedTeamId.trim()),
    }),
    [selectedTeamId, teamMembers, teamInfo, isLoading, error, refresh],
  );
}
