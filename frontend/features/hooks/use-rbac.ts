'use client';

import { useMemo } from 'react';

import type { UserRole } from '@/types';

import { isAdmin, isEmployee, isManager } from '../utils/role';

export interface RbacState {
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  hasRole: (allowedRoles: readonly UserRole[]) => boolean;
}

export function useRbac(role: string | null | undefined): RbacState {
  return useMemo(
    () => ({
      isAdmin: isAdmin(role),
      isManager: isManager(role),
      isEmployee: isEmployee(role),
      hasRole: (allowedRoles: readonly UserRole[]) => {
        if (allowedRoles.length === 0) {
          return true;
        }

        return allowedRoles.some((allowedRole) => {
          if (allowedRole === 'ADMIN') {
            return isAdmin(role);
          }

          if (allowedRole === 'MANAGER') {
            return isManager(role);
          }

          return isEmployee(role);
        });
      },
    }),
    [role],
  );
}