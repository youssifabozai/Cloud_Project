import api from './api';
import type { Task, CreateTaskDto, TaskStatus } from '@/types';

export const tasksService = {
  /** GET /tasks — scoped by role (GSI query for employees) */
  getAll: (teamId?: string) => {
    const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    return api.get<Task[]>(`/tasks${qs}`);
  },

  /** GET /tasks/:id */
  getById: (taskId: string) =>
    api.get<Task>(`/tasks/${taskId}`),

  /** PATCH /tasks/:id/status */
  updateStatus: (taskId: string, status: TaskStatus) =>
    api.patch<{ message: string; taskId: string; fromStatus: string; toStatus: string }>(
      `/tasks/${taskId}/status`,
      { status },
    ),

  /** POST /tasks — manager/admin only */
  create: (dto: CreateTaskDto) =>
    api.post<Task>('/tasks', dto),

  /** DELETE /tasks/:id — manager/admin only */
  remove: (taskId: string) =>
    api.delete<{ success: boolean }>(`/tasks/${taskId}`),
};
