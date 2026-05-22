'use client';

import { useCallback, useMemo, useState } from 'react';

import { normalizeApiError } from '../api/errors';
import { usersService } from '@/services';

import type { UserRole } from '@/types';

const ALLOWED_ROLES: readonly UserRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

export interface ChangeRoleResult {
  userId: string;
  role: UserRole;
  message: string;
}

export interface UseChangeRoleState {
  isSaving: boolean;
  error: string | null;
  result: ChangeRoleResult | null;
  changeRole: (userId: string, role: string) => Promise<ChangeRoleResult>;
  reset: () => void;
}

export function useChangeRole(): UseChangeRoleState {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChangeRoleResult | null>(null);

  const changeRole = useCallback(async (userId: string, role: string) => {
    const normalizedRole = role.trim().toUpperCase() as UserRole;

    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      const validationMessage = 'Role must be ADMIN, MANAGER, or EMPLOYEE.';
      setError(validationMessage);
      throw new Error(validationMessage);
    }

    if (!userId.trim()) {
      const validationMessage = 'A valid user is required.';
      setError(validationMessage);
      throw new Error(validationMessage);
    }

    setIsSaving(true);
    setError(null);
    setResult(null);

    try {
      const response = await usersService.updateRole(userId.trim(), normalizedRole);
      const nextResult = { userId: userId.trim(), role: normalizedRole, message: response.message };
      setResult(nextResult);
      return nextResult;
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized.message || 'Failed to update role');
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
    () => ({ isSaving, error, result, changeRole, reset }),
    [isSaving, error, result, changeRole, reset],
  );
}
