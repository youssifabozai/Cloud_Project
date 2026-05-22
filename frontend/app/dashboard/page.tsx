'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Cpu,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { EmptyState, LoadingState } from '@/features/components';
import {
  metricsService,
  type BurndownSummary,
  type DashboardSummary,
  type DistributionMetric,
  type TimeSeriesPoint,
} from '@/services/metrics.service';
import { projectsService, type ProjectRecord } from '@/services/projects.service';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed. Please try again.';
}

function formatNumber(value: number | undefined) {
  return typeof value === 'number' ? value.toLocaleString() : '0';
}

function formatPercent(value: number | undefined) {
  return `${(value ?? 0).toFixed(2)}%`;
}

function MetricCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  description: string;
}) {
  return (
    <article className="cloud-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">{label}</p>
          <p className="mt-3 text-3xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--primary)]">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </article>
  );
}

function DistributionList({ title, values }: { title: string; values: Record<string, number> }) {
  const rows = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map(([, value]) => value), 1);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-5 text-sm text-[var(--text-secondary)]">
        No {title.toLowerCase()} data available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
      {rows.map(([label, value]) => (
        <div key={label} className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-[var(--text-primary)]">{label}</span>
            <span className="text-[var(--text-secondary)]">{value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
            <div
              className="h-full rounded-full bg-[var(--primary)]"
              style={{ width: `${Math.max(8, (value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimeSeriesTable({ points }: { points: TimeSeriesPoint[] }) {
  if (points.length === 0) {
    return (
      <EmptyState
        title="No time-series data"
        description="The Metrics API returned no created/closed task data yet."
        icon={<TrendingUp className="h-6 w-6" />}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)]">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-[var(--bg-secondary)] text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Closed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {points.map((point) => (
            <tr key={point.date}>
              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{point.date}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{point.created}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{point.closed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const auth = useAuth();
  const { pushToast } = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [distribution, setDistribution] = useState<DistributionMetric | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [burndown, setBurndown] = useState<BurndownSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canViewMetrics = auth.isManager || auth.isAdmin;
  const firstProject = projects[0] ?? null;

  const loadDashboard = useCallback(async () => {
    if (!canViewMetrics) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [nextSummary, nextTimeSeries, nextDistribution, nextProjects] = await Promise.all([
        metricsService.getDashboardSummary(),
        metricsService.getTimeSeries(),
        metricsService.getDistribution(),
        projectsService.getAll(),
      ]);

      setSummary(nextSummary);
      setTimeSeries(nextTimeSeries);
      setDistribution(nextDistribution);
      setProjects(nextProjects);

      if (nextProjects[0]?.projectId) {
        try {
          const nextBurndown = await metricsService.getBurndown(nextProjects[0].projectId);
          setBurndown(nextBurndown);
        } catch {
          setBurndown(null);
        }
      } else {
        setBurndown(null);
      }
    } catch (requestError) {
      const message = errorMessage(requestError);
      setError(message);
      pushToast('error', 'Dashboard unavailable', message);
    } finally {
      setIsLoading(false);
    }
  }, [canViewMetrics, pushToast]);

  useEffect(() => {
    if (!auth.isLoading && auth.session) {
      void loadDashboard();
    }
  }, [auth.isLoading, auth.session, loadDashboard]);

  const closedRatio = useMemo(() => {
    if (!summary || summary.totalTasks === 0) {
      return 0;
    }

    return Math.round((summary.closedTasks / summary.totalTasks) * 100);
  }, [summary]);

  if (auth.isLoading || !auth.session) {
    return (
      <main className="cloud-page min-h-screen px-5 py-8">
        <LoadingState fullHeight title="Loading dashboard" description="Checking your workspace session." />
      </main>
    );
  }

  return (
    <main className="cloud-page min-h-screen px-5 py-8 text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="cloud-card rounded-2xl p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-premium">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  Backend metrics for company task throughput, completion, project progress, and EC2 health.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle theme={auth.theme} onToggle={() => auth.setTheme(auth.theme === 'dark' ? 'light' : 'dark')} />
              <Link
                href="/dashboard/tasks"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--primary)]"
              >
                <KanbanSquare className="h-4 w-4" />
                Board
              </Link>
              <Link
                href="/dashboard/projects"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--primary)]"
              >
                <FolderKanban className="h-4 w-4" />
                Projects
              </Link>
              {canViewMetrics && (
                <button
                  type="button"
                  onClick={() => void loadDashboard()}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--primary)]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              )}
              <button
                type="button"
                onClick={auth.logout}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-premium transition hover:opacity-95"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </header>

        {!canViewMetrics ? (
          <EmptyState
            title="Manager dashboard"
            description="Your account is authenticated, but the Metrics API is restricted to Manager/Admin users."
            icon={<BarChart3 className="h-6 w-6" />}
          />
        ) : isLoading ? (
          <LoadingState title="Loading metrics" description="Fetching summary, distribution, time-series, and project data." />
        ) : error ? (
          <EmptyState
            title="Dashboard metrics could not be loaded"
            description={error}
            icon={<Activity className="h-6 w-6" />}
            primaryAction={{ label: 'Retry', onClick: () => void loadDashboard() }}
          />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total tasks"
                value={formatNumber(summary?.totalTasks)}
                icon={<BarChart3 className="h-5 w-5" />}
                description="All task records currently included in backend metrics."
              />
              <MetricCard
                label="Open tasks"
                value={formatNumber(summary?.openTasks)}
                icon={<TrendingUp className="h-5 w-5" />}
                description="Tasks not currently counted as Done or closed."
              />
              <MetricCard
                label="Closed tasks"
                value={formatNumber(summary?.closedTasks)}
                icon={<CheckCircle2 className="h-5 w-5" />}
                description={`${closedRatio}% completion across measured tasks.`}
              />
              <MetricCard
                label="EC2 CPU"
                value={formatPercent(summary?.cpuUtilization)}
                icon={<Cpu className="h-5 w-5" />}
                description="Average EC2 CPU utilization from the backend CloudWatch query."
              />
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
              <article className="cloud-card rounded-2xl p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Task flow</p>
                    <h2 className="mt-2 text-xl font-bold">Created and closed per day</h2>
                  </div>
                  <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <TimeSeriesTable points={timeSeries} />
              </article>

              <article className="cloud-card rounded-2xl p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Distribution</p>
                    <h2 className="mt-2 text-xl font-bold">Status and priority</h2>
                  </div>
                  <Activity className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <div className="grid gap-6">
                  <DistributionList title="By status" values={distribution?.byStatus ?? {}} />
                  <DistributionList title="By priority" values={distribution?.byPriority ?? {}} />
                </div>
              </article>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <article className="cloud-card rounded-2xl p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Projects</p>
                    <h2 className="mt-2 text-xl font-bold">Project inventory</h2>
                  </div>
                  <FolderKanban className="h-5 w-5 text-[var(--primary)]" />
                </div>

                {projects.length === 0 ? (
                  <EmptyState
                    title="No projects yet"
                    description="Create a project from the Projects page to enable project-level tracking."
                    icon={<FolderKanban className="h-6 w-6" />}
                    primaryAction={{ label: 'Open projects', href: '/dashboard/projects' }}
                  />
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 5).map((project) => (
                      <div
                        key={project.projectId}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{project.name}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">{project.status ?? 'ACTIVE'}</p>
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                          {(project.assignedTeamIds?.length ?? 0)} teams
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="cloud-card rounded-2xl p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Burndown</p>
                    <h2 className="mt-2 text-xl font-bold">{firstProject ? firstProject.name : 'Project progress'}</h2>
                  </div>
                  <TrendingDown className="h-5 w-5 text-[var(--primary)]" />
                </div>

                {burndown ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Total</p>
                        <p className="mt-2 text-2xl font-bold">{burndown.totalProjectTasks}</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Closed</p>
                        <p className="mt-2 text-2xl font-bold">{burndown.closedProjectTasks}</p>
                      </div>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)]"
                        style={{
                          width: `${burndown.totalProjectTasks > 0
                            ? Math.max(8, (burndown.closedProjectTasks / burndown.totalProjectTasks) * 100)
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No burndown data"
                    description="The current backend returns burndown only when a project has task records."
                    icon={<TrendingDown className="h-6 w-6" />}
                  />
                )}
              </article>
            </section>

            <section className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/70 p-5 text-sm leading-6 text-[var(--text-secondary)]">
              Team-level closed-per-day metrics and average time-to-close are not exposed by the current Metrics API, so this dashboard displays the backend-supported summary, global created/closed time series, distribution, burndown, and EC2 CPU metrics.
            </section>
          </>
        )}
      </div>
    </main>
  );
}
