import api from './api';

export interface DashboardSummary {
  totalTasks: number;
  openTasks: number;
  closedTasks: number;
  cpuUtilization: number;
}

export interface DistributionMetric {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface TimeSeriesPoint {
  date: string;
  created: number;
  closed: number;
}

export interface BurndownSummary {
  projectId: string;
  totalProjectTasks: number;
  closedProjectTasks: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const metricsService = {
  async getDashboardSummary() {
    const response = await api.get<ApiEnvelope<DashboardSummary>>('/metrics/dashboard/summary');
    return response.data;
  },

  async getTimeSeries() {
    const response = await api.get<ApiEnvelope<TimeSeriesPoint[]>>('/metrics/visualizations/time-series');
    return response.data;
  },

  async getDistribution() {
    const response = await api.get<ApiEnvelope<DistributionMetric>>('/metrics/visualizations/distribution');
    return response.data;
  },

  async getBurndown(projectId: string) {
    const response = await api.get<ApiEnvelope<BurndownSummary>>(
      `/metrics/visualizations/burndown?projectId=${encodeURIComponent(projectId)}`,
    );
    return response.data;
  },
};
