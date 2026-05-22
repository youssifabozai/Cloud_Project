import api from './api';

export interface DashboardSummary {
  totalTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  completedTasks: number;
  cpuUtilization?: number;
}

export interface DistributionMetric {
  teamDistribution: Record<string, number>;
  statusDistribution?: Record<string, number>;
  priorityDistribution?: Record<string, number>;
}

export type TimeSeriesPoint = Record<string, number | string | null>;
export type BurndownPoint = Record<string, number | string | null>;

export const metricsService = {
  getDashboardSummary: () =>
    api.get<DashboardSummary>('/metrics/dashboard/summary'),

  getTimeSeries: () =>
    api.get<TimeSeriesPoint[]>('/metrics/visualizations/time-series'),

  getDistribution: () =>
    api.get<DistributionMetric>('/metrics/visualizations/distribution'),

  getBurndown: (projectId: string) =>
    api.get<BurndownPoint[]>(`/metrics/visualizations/burndown?projectId=${encodeURIComponent(projectId)}`),
};
