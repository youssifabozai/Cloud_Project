'use client';

import { useCallback, useMemo, useState } from 'react';

import { normalizeApiError } from '../api/errors';
import { usersService } from '@/services';

export interface DeleteUserResult {
  userId: string;
  message: string;
}

export interface UseDeleteUserState {
  isDeleting: boolean;
  error: string | null;
  result: DeleteUserResult | null;
  deleteUser: (userId: string) => Promise<DeleteUserResult>;
  reset: () => void;
}

export function useDeleteUser(): UseDeleteUserState {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeleteUserResult | null>(null);

  const deleteUser = useCallback(async (userId: string) => {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      const message = 'A valid user is required for deletion.';
      setError(message);
      throw new Error(message);
    }

    setIsDeleting(true);
    setError(null);
    setResult(null);

    try {
      const response = await usersService.deleteUser(normalizedUserId);
      const payload = response.data;
      const nextResult = { userId: normalizedUserId, message: payload.message };
      setResult(nextResult);
      return nextResult;
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized.message || 'Failed to delete user');
      throw normalized;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setIsDeleting(false);
  }, []);

  return useMemo(
    () => ({ isDeleting, error, result, deleteUser, reset }),
    [isDeleting, error, result, deleteUser, reset],
  );
}