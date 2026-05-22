import api from './api';
import type { ActivityLog } from '@/types';

export const auditLogsService = {
  /** Manager / Admin — full company audit table */
  getAll: (params?: {
    taskId?: string;
    actionType?: string;
    userId?: string;
    teamId?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.taskId) qs.set('taskId', params.taskId);
    if (params?.actionType) qs.set('actionType', params.actionType);
    if (params?.userId) qs.set('userId', params.userId);
    if (params?.teamId) qs.set('teamId', params.teamId);
    const q = qs.toString();
    return api.get<ActivityLog[]>(`/audit-logs${q ? `?${q}` : ''}`);
  },

  /** Any user — recent events for their team (overview feed) */
  getRecentForTeam: (teamId: string) =>
    api.get<ActivityLog[]>(`/audit-logs/team/${encodeURIComponent(teamId)}/recent`),

  /** Per-task timeline in modal */
  getTaskHistory: (taskId: string) =>
    api.get<ActivityLog[]>(`/tasks/${taskId}/history`),
};
