import api from './api';
import type { Project, CreateProjectDto, UpdateProjectDto } from '@/types';

type ProjectsListResponse = {
  success: boolean;
  message: string;
  data: {
    total: number;
    projects: Project[];
  };
};

export const projectsService = {
  getAll: async () => {
    const res = await api.get<ProjectsListResponse>('/projects');
    return res.data?.projects ?? [];
  },
  getById: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (dto: CreateProjectDto) => api.post<Project>('/projects', dto),
  update: (id: string, dto: UpdateProjectDto) =>
    api.put<Project>(`/projects/${id}`, dto),
  remove: (id: string) => api.delete<{ success: boolean }>(`/projects/${id}`),
};
