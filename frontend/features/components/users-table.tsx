'use client';

import React from 'react';
import type { UserSummary } from '../types/user.types';
import { EmptyState } from './empty-state';

interface UsersTableProps {
  users: UserSummary[];
  isLoading: boolean;
  error?: string | null;
  canManage: boolean;
  onAssignTeam?: (userId: string) => void;
  onChangeRole?: (userId: string) => void;
  onDelete?: (userId: string) => void;
}

export function UsersTable({ users, isLoading, error, canManage, onAssignTeam, onChangeRole, onDelete }: UsersTableProps) {
  if (isLoading) {
    return (
      <div className="w-full overflow-x-auto">
        <div className="animate-pulse">
          <div className="h-6 bg-[var(--border-color)]/30 rounded mb-4 w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 bg-[var(--bg-secondary)]/40 rounded">
                <div className="h-8 w-8 rounded-full bg-[var(--border-color)]/30 mb-2" />
                <div className="h-3 bg-[var(--border-color)]/30 rounded w-3/4 mb-1" />
                <div className="h-3 bg-[var(--border-color)]/30 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="text-red-500 font-semibold">{error}</div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return <EmptyState title="No users" description="No users were found for the current filters." />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr className="text-left text-sm text-[var(--text-secondary)] border-b border-[var(--border-color)]">
            <th className="py-3 px-2">User</th>
            <th className="py-3 px-2">Email</th>
            <th className="py-3 px-2">Role</th>
            <th className="py-3 px-2">Team</th>
            {canManage && <th className="py-3 px-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.userId} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/5">
              <td className="py-3 px-2 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--border-color)]/10 overflow-hidden flex items-center justify-center text-sm font-semibold text-[var(--text-secondary)]">
                  {u.profile?.fullName ? u.profile.fullName.charAt(0) : u.email.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-sm">{u.profile?.fullName ?? u.email.split('@')[0]}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{u.userId}</div>
                </div>
              </td>
              <td className="py-3 px-2 text-sm text-[var(--text-secondary)]">{u.email}</td>
              <td className="py-3 px-2 text-sm">{u.role}</td>
              <td className="py-3 px-2 text-sm">{u.teamId ?? '—'}</td>
              {canManage && (
                <td className="py-3 px-2 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 text-xs border rounded-md hover:bg-[var(--border-color)]/20"
                      onClick={() => onAssignTeam?.(u.userId)}
                    >
                      Assign Team
                    </button>
                    <button
                      className="px-3 py-1 text-xs border rounded-md hover:bg-[var(--border-color)]/20"
                      onClick={() => onChangeRole?.(u.userId)}
                    >
                      Change Role
                    </button>
                    <button
                      className="px-3 py-1 text-xs border rounded-md text-red-500 hover:bg-red-500/10"
                      onClick={() => onDelete?.(u.userId)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UsersTable;
