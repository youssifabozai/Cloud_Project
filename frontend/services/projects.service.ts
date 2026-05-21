import api from './api';
import type { Project, CreateProjectDto, UpdateProjectDto } from '@/types';

export const projectsService = {
  getAll:    ()                               => api.get<Project[]>('/projects'),
  getById:   (id: string)                     => api.get<Project>(`/projects/${id}`),
  create:    (dto: CreateProjectDto)          => api.post<Project>('/projects', dto),
  update:    (id: string, dto: UpdateProjectDto) => api.put<Project>(`/projects/${id}`, dto),
  remove:    (id: string)                     => api.delete<{ success: boolean }>(`/projects/${id}`),
};
