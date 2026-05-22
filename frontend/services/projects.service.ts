import api from './api';
import type { Project, CreateProjectDto, UpdateProjectDto } from '@/types';

type ProjectEnvelope = {
  success: boolean;
  message?: string;
  data: Project;
};

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
  getById: async (id: string) => {
    const res = await api.get<ProjectEnvelope>(`/projects/${id}`);
    return res.data;
  },
  create: async (dto: CreateProjectDto) => {
    const res = await api.post<ProjectEnvelope>('/projects', dto);
    return res.data;
  },
  update: async (id: string, dto: UpdateProjectDto) => {
    const res = await api.put<ProjectEnvelope>(`/projects/${id}`, dto);
    return res.data;
  },
  remove: (id: string) => api.delete<{ success: boolean }>(`/projects/${id}`),
};
