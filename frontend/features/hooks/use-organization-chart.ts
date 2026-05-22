'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { normalizeApiError } from '../api/errors';
import { useUserSession } from './use-user-session';
import { usersService } from '@/services';

import type { OrgChartApiResponse, OrgChartData } from '@/services/users.service';

export interface UseOrganizationChartState {
  data: OrgChartData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  message: string | null;
}

export function useOrganizationChart(): UseOrganizationChartState {
  const { session } = useUserSession();

  const [data, setData] = useState<OrgChartData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setData(null);
      setMessage(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await usersService.getOrgChart();
      const payload = response as OrgChartApiResponse;
      setData(payload.data);
      setMessage(payload.message);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setData(null);
      setMessage(null);
      setError(normalized.message || 'Failed to load organization chart');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

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
      data,
      isLoading,
      error,
      refresh,
      message,
    }),
    [data, isLoading, error, refresh, message],
  );
}
