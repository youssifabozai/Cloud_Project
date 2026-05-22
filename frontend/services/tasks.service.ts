import api from './api';
import type {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  TaskStatus,
  PresignedUploadResponse,
} from '@/types';

export const tasksService = {
  /** GET /tasks — scoped by role (GSI query for employees) */
  getAll: (teamId?: string) => {
    const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    return api.get<Task[]>(`/tasks${qs}`);
  },

  /** GET /tasks/:id — includes presigned imageUrl + thumbnailUrl */
  getById: (taskId: string) => api.get<Task>(`/tasks/${taskId}`),

  /** GET /tasks/upload-url */
  getUploadUrl: (fileName: string, contentType: string) => {
    const qs = new URLSearchParams({ fileName, contentType });
    return api.get<PresignedUploadResponse>(`/tasks/upload-url?${qs.toString()}`);
  },

  /** POST /tasks/process-image — originals/ → resized/ after S3 PUT */
  processImage: (imageKey: string) =>
    api.post<{ imageKey: string; resizedKey: string; resizedBucket: string }>(
      '/tasks/process-image',
      { imageKey },
    ),

  /** POST /tasks — manager only */
  create: (dto: CreateTaskDto) => api.post<Task>('/tasks', dto),

  /** PUT /tasks/:id — manager only; supports imageKey / clearImage */
  update: (taskId: string, dto: UpdateTaskDto) =>
    api.put<Task>(`/tasks/${taskId}`, dto),

  /** PATCH /tasks/:id/status */
  updateStatus: (taskId: string, status: TaskStatus) =>
    api.patch<{
      message: string;
      task?: Task;
      taskId: string;
      fromStatus: string;
      toStatus: string;
      updatedAt: string;
    }>(`/tasks/${taskId}/status`, { status }),

  /** DELETE /tasks/:id — removes task + current S3 images */
  remove: (taskId: string) =>
    api.delete<{ message: string; taskId: string }>(`/tasks/${taskId}`),
};
