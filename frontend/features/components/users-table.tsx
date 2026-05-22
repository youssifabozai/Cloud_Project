'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Shield, Trash2, Users2 } from 'lucide-react';

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


function roleTone(role: string): string {
  if (role === 'ADMIN') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  }

  if (role === 'MANAGER') {
    return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300';
  }

  return 'border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300';
}

function getAvatarSeed(user: UserSummary): string {
  const source = user.profile?.fullName?.trim() || user.email.trim();
  return source.slice(0, 2).toUpperCase();
}
export function UsersTable({ users, isLoading, error, canManage, onAssignTeam, onChangeRole, onDelete }: UsersTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-[26px] border border-[var(--border-color)] bg-white/50 p-4 shadow-premium dark:bg-white/8">
        <div className="mb-4 h-5 w-44 animate-pulse rounded-xl bg-[var(--border-color)]/40" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[var(--border-color)] bg-white/60 p-4 dark:bg-white/10">
              <div className="flex animate-pulse items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[var(--border-color)]/40" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-[var(--border-color)]/40" />
                  <div className="h-3 w-1/2 rounded bg-[var(--border-color)]/30" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to load users"
        description={error}
        icon={<AlertCircle className="h-5 w-5" />}
      />
    );
  }

  if (!users || users.length === 0) {
    return (
      <EmptyState
        title="No users"
        description="No users were found for the current filters. Try adjusting search or role filters."
        icon={<Users2 className="h-5 w-5" />}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[26px] border border-[var(--border-color)] bg-white/50 shadow-premium dark:bg-white/8">
      <div className="hidden max-h-[640px] overflow-auto lg:block">
        <table className="min-w-full border-collapse">
          <thead className="sticky top-0 z-10 border-b border-[var(--border-color)] bg-white/85 backdrop-blur-md dark:bg-slate-900/65">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Team</th>
              {canManage ? <th className="px-5 py-4">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {users.map((u, index) => (
              <motion.tr
                key={u.userId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: index * 0.015 }}
                className="group border-b border-[var(--border-color)]/80 transition-colors hover:bg-sky-500/5"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 text-sm font-black text-white">
                      {u.profile?.avatar ? (
                        <img src={u.profile.avatar} alt={u.profile?.fullName ?? u.email} className="h-full w-full object-cover" />
                      ) : (
                        <span>{getAvatarSeed(u)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{u.profile?.fullName ?? u.email.split('@')[0]}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{u.userId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{u.email}</td>
                <td className="px-5 py-4 text-sm">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${roleTone(u.role)}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-[var(--text-secondary)]">{u.teamId ?? 'Unassigned'}</td>
                {canManage ? (
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-all hover:bg-white dark:bg-white/10"
                        onClick={() => onAssignTeam?.(u.userId)}
                      >
                        <Users2 className="h-3.5 w-3.5" />
                        Assign Team
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-500/20 dark:text-blue-300"
                        onClick={() => onChangeRole?.(u.userId)}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Change Role
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-500/20 dark:text-red-300"
                        onClick={() => onDelete?.(u.userId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                ) : null}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 lg:hidden">
        {users.map((u, index) => (
          <motion.article
            key={u.userId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: index * 0.02 }}
            className="rounded-2xl border border-[var(--border-color)] bg-white/70 p-4 dark:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 text-sm font-black text-white">
                {u.profile?.avatar ? (
                  <img src={u.profile.avatar} alt={u.profile?.fullName ?? u.email} className="h-full w-full object-cover" />
                ) : (
                  <span>{getAvatarSeed(u)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{u.profile?.fullName ?? u.email.split('@')[0]}</h3>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${roleTone(u.role)}`}>
                    {u.role}
                  </span>
                </div>
                <p className="mt-1 break-all text-xs text-[var(--text-secondary)]">{u.email}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{u.teamId ?? 'Unassigned'}</p>
                {canManage ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-[var(--border-color)] bg-white/80 px-2 py-1.5 text-[11px] font-semibold text-[var(--text-primary)] dark:bg-white/10"
                      onClick={() => onAssignTeam?.(u.userId)}
                    >
                      Team
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300"
                      onClick={() => onChangeRole?.(u.userId)}
                    >
                      Role
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[11px] font-semibold text-red-700 dark:text-red-300"
                      onClick={() => onDelete?.(u.userId)}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
