import api from './api';
import type { Comment } from '@/types';

export interface CreateCommentDto {
  taskId: string;
  text: string;
}

export interface UpdateCommentDto {
  taskId: string;
  text: string;
}

export const commentsService = {
  getByTaskId: (taskId: string) => api.get<Comment[]>(`/comments/${taskId}`),

  create: (dto: CreateCommentDto) => api.post<Comment>('/comments', dto),

  update: (commentId: string, dto: UpdateCommentDto) =>
    api.put<Comment>(`/comments/${commentId}`, dto),

  remove: (commentId: string, taskId: string) =>
    api.delete<{ message: string; commentId: string }>(
      `/comments/${commentId}?taskId=${encodeURIComponent(taskId)}`,
    ),
};
