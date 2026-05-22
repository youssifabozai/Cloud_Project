'use client';

import { motion } from 'framer-motion';
import type { UserProfile } from '@/types';
import { EmptyState } from './empty-state';
import { AlertCircle, RefreshCcw, Users2 } from 'lucide-react';

interface TeamMembersListProps {
  members: UserProfile[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function getAvatarLabel(member: UserProfile): string {
  const source = member.fullName ?? member.name ?? member.email ?? 'User';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || source.slice(0, 2).toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  const tone =
    role === 'ADMIN'
      ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
      : role === 'MANAGER'
        ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
        : 'border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300';

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${tone}`}>{role}</span>;
}

export function TeamMembersList({ members, isLoading, error, onRetry }: TeamMembersListProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-white/55 p-4 shadow-premium dark:bg-white/8">
        <div className="mb-4 h-5 w-40 animate-pulse rounded-xl bg-[var(--border-color)]/40" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-[var(--border-color)] bg-white/65 p-4 dark:bg-white/10">
              <div className="flex animate-pulse items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[var(--border-color)]/35" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-[var(--border-color)]/35" />
                  <div className="h-3 w-1/2 rounded bg-[var(--border-color)]/25" />
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
        title="Unable to load team members"
        description={error}
        icon={<AlertCircle className="h-5 w-5" />}
        primaryAction={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
      />
    );
  }

  if (!members || members.length === 0) {
    return (
      <EmptyState
        title="No members found"
        description="This team currently has no visible members in the roster."
        icon={<Users2 className="h-5 w-5" />}
        primaryAction={onRetry ? { label: 'Reload team', onClick: onRetry } : undefined}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-white/55 shadow-premium dark:bg-white/8"
    >
      <div className="border-b border-[var(--border-color)] px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Members</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Member roster with avatars and access roles.</p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-all hover:bg-white/90 dark:bg-white/10"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="hidden max-h-[620px] overflow-auto lg:block">
        <table className="min-w-full border-collapse">
          <thead className="sticky top-0 z-10 border-b border-[var(--border-color)] bg-white/85 text-left text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)] backdrop-blur-md dark:bg-slate-900/65">
            <tr>
              <th className="px-6 py-4 font-semibold">Member</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">Team</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <motion.tr
                key={member.userId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: index * 0.015 }}
                className="border-t border-[var(--border-color)] transition-colors hover:bg-sky-500/5"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-600 text-sm font-black text-white shadow-sm">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.fullName ?? member.name} className="h-full w-full object-cover" />
                      ) : (
                        <span>{getAvatarLabel(member)}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{member.fullName ?? member.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{member.userId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{member.email}</td>
                <td className="px-6 py-4"><RoleBadge role={member.role} /></td>
                <td className="px-6 py-4 text-sm font-medium text-[var(--text-secondary)]">{member.teamId || 'Organization-wide'}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 lg:hidden">
        {members.map((member, index) => (
          <motion.article
            key={member.userId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: index * 0.02 }}
            className="rounded-2xl border border-[var(--border-color)] bg-white/60 p-4 dark:bg-white/8"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-600 text-sm font-black text-white">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.fullName ?? member.name} className="h-full w-full object-cover" />
                ) : (
                  <span>{getAvatarLabel(member)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="truncate text-sm font-semibold text-[var(--text-primary)]">{member.fullName ?? member.name}</h4>
                  <RoleBadge role={member.role} />
                </div>
                <p className="mt-1 break-all text-sm text-[var(--text-secondary)]">{member.email}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{member.teamId || 'Organization-wide'}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </motion.div>
  );
}