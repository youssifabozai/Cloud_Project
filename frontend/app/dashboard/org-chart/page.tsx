'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { useRouter } from 'next/navigation';
import { Building2, ArrowRight, Network, RefreshCcw, Sparkles } from 'lucide-react';

import { EmptyState, OrganizationChartView, ProtectedLayout } from '@/features/components';
import { useOrganizationChart, useRbac, useUserSession } from '@/features/hooks';

export default function OrganizationChartPage() {
  const router = useRouter();
  const { session } = useUserSession();
  const rbac = useRbac(session?.role ?? null);
  const { data, isLoading, error, refresh, message } = useOrganizationChart();

  const scopeLabel = useMemo(() => {
    if (rbac.isAdmin) {
      return 'Admin';
    }

    if (rbac.isManager) {
      return 'Manager';
    }

    return 'Employee';
  }, [rbac.isAdmin, rbac.isManager]);

  return (
    <ProtectedLayout>
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
                  <Network className="h-3.5 w-3.5" />
                  Organization Chart
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">Enterprise hierarchy at a glance</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                    Explore admins, managers, teams, and employees in a hierarchy that adapts to your role and visibility scope.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-[26px] border border-[var(--border-color)] bg-white/55 p-4 dark:bg-white/8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/70 text-sky-600 dark:bg-white/10 dark:text-sky-300">
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Current scope</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{scopeLabel} visibility</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={refresh}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-white/90 dark:bg-white/10"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh chart
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/users')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Team members
                  </button>
                </div>
              </div>
            </div>
          </motion.section>

          {!data && !isLoading && !error ? (
            <EmptyState
              title="No organization chart loaded"
              description="Load the org chart to see the current hierarchy for your account."
              icon={<Sparkles className="h-5 w-5" />}
              primaryAction={{ label: 'Load chart', onClick: refresh }}
            />
          ) : (
            <OrganizationChartView data={data} isLoading={isLoading} error={error} onRetry={refresh} message={message} />
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}