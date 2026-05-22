'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchUsers } from '../api/users';
import { normalizeApiError } from '../api/errors';
import { useUserSession } from './use-user-session';
import { useRbac } from './use-rbac';

import type { UserSummary } from '../types/user.types';

export function useUsers() {
  const { session } = useUserSession();
  const rbac = useRbac(session?.role ?? null);
  const sessionTeamId = session?.teamId ?? '';
  const isEmployee = rbac.isEmployee;

  const [items, setItems] = useState<UserSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUsers({ search: search || undefined, role: roleFilter ?? undefined });

      let filtered = data.items ?? [];

      // Enforce team isolation for employees on the client side as well
      if (isEmployee && sessionTeamId) {
        filtered = filtered.filter((u) => u.teamId === sessionTeamId);
      }

      setItems(filtered);
      setTotal(data.total ?? filtered.length);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized.message ?? 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, isEmployee, sessionTeamId]);

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

  const canManage = useMemo(() => rbac.isAdmin || rbac.isManager, [rbac.isAdmin, rbac.isManager]);

  return {
    items,
    total,
    isLoading,
    error,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    refresh,
    canManage,
  } as const;
}
