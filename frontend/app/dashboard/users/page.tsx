'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';

import { useRouter, useSearchParams } from 'next/navigation';
import { Users2, Building2, Sparkles, ArrowRight, RefreshCcw, Shield } from 'lucide-react';

import { EmptyState, ProtectedLayout } from '@/features/components';
import { TeamMembersList } from '@/features/components';
import { useTeamMembers, useRbac, useUserSession } from '@/features/hooks';

function TeamLookupForm({
  initialTeamId,
  onSubmit,
}: {
  initialTeamId: string;
  onSubmit: (teamId: string) => void;
}) {
  const [teamDraft, setTeamDraft] = useState(initialTeamId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(teamDraft.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-[26px] border border-[var(--border-color)] bg-white/55 p-4 dark:bg-white/8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/70 text-sky-600 dark:bg-white/10 dark:text-sky-300">
          <Building2 className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Load team</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Enter a team ID to load members</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={teamDraft}
          onChange={(event) => setTeamDraft(event.target.value)}
          placeholder="Frontend, Backend, QA, DevOps"
          className="min-w-0 flex-1 rounded-2xl border border-[var(--border-color)] bg-white/70 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)] focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:bg-white/10"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!teamDraft.trim()}
        >
          <ArrowRight className="h-4.5 w-4.5" />
          Load team
        </button>
      </div>
    </form>
  );
}

export default function TeamMembersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useUserSession();
  const rbac = useRbac(session?.role ?? null);

  const initialTeamId = useMemo(() => searchParams.get('teamId') ?? session?.teamId ?? '', [searchParams, session?.teamId]);

  const {
    selectedTeamId,
    setSelectedTeamId,
    teamMembers,
    teamInfo,
    isLoading,
    error,
    refresh,
    hasSelection,
  } = useTeamMembers(initialTeamId);

  const handleTeamLoad = (nextTeamId: string) => {
    setSelectedTeamId(nextTeamId);

    const nextUrl = nextTeamId ? `/dashboard/users?teamId=${encodeURIComponent(nextTeamId)}` : '/dashboard/users';
    router.replace(nextUrl);
  };

  return (
    <ProtectedLayout allowedRoles={['ADMIN', 'MANAGER']}>
      <div className="cloud-page min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="cloud-surface glass-panel rounded-[30px] border border-[var(--border-color)] p-5 shadow-premium sm:p-6"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                  <Users2 className="h-3.5 w-3.5" />
                  Team Members
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">Team roster and access overview</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                    Review the current team roster, member avatars, and role assignments from the team-scoped user API.
                  </p>
                </div>
              </div>

              <TeamLookupForm key={initialTeamId} initialTeamId={initialTeamId} onSubmit={handleTeamLoad} />
            </div>
          </motion.section>

          {!hasSelection ? (
            <EmptyState
              title="No team selected"
              description={session?.teamId ? 'Use the team loader above to inspect another team.' : 'Enter a team ID to load the roster.'}
              icon={<Sparkles className="h-5 w-5" />}
            />
          ) : (
            <>
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.04 }}
                className="grid gap-4 lg:grid-cols-3"
              >
                <div className="cloud-surface glass-panel rounded-[26px] border border-[var(--border-color)] bg-white/60 p-5 shadow-premium dark:bg-white/8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Active team</p>
                  <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">{teamInfo?.name ?? selectedTeamId}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{teamInfo?.description ?? 'Team metadata is summarized from the selected team scope.'}</p>
                </div>

                <div className="cloud-surface glass-panel rounded-[26px] border border-[var(--border-color)] bg-white/60 p-5 shadow-premium dark:bg-white/8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Member count</p>
                  <div className="mt-2 flex items-end gap-3">
                    <span className="text-3xl font-black text-[var(--text-primary)]">{teamMembers.length}</span>
                    <span className="pb-1 text-sm font-semibold text-[var(--text-secondary)]">visible members</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Fetched via GET /users/team/:teamId and filtered by the authenticated session.</p>
                </div>

                <div className="cloud-surface glass-panel rounded-[26px] border border-[var(--border-color)] bg-white/60 p-5 shadow-premium dark:bg-white/8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Access scope</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/60 text-sky-500 dark:bg-white/8">
                      <Shield className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{rbac.isAdmin ? 'Admin oversight' : 'Manager oversight'}</p>
                      <p className="text-sm text-[var(--text-secondary)]">RBAC-gated team member view</p>
                    </div>
                  </div>
                </div>
              </motion.section>

              <TeamMembersList members={teamMembers} isLoading={isLoading} error={error} onRetry={refresh} />

              <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[var(--border-color)] bg-white/55 px-5 py-4 text-sm text-[var(--text-secondary)] shadow-premium dark:bg-white/8">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-sky-500" />
                  <span>{isLoading ? 'Refreshing roster...' : 'Roster synced from the current team scope.'}</span>
                </div>
                <button
                  type="button"
                  onClick={refresh}
                  className="rounded-xl border border-[var(--border-color)] bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-all hover:bg-white/90 dark:bg-white/10"
                >
                  Reload
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
