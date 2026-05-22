import api from './api';

export type ProjectStatus = 'ACTIVE' | 'COMPLETED';

export interface ProjectRecord {
  projectId: string;
  name: string;
  description?: string;
  status?: ProjectStatus | string;
  deadline?: string | null;
  managerId?: string;
  createdById?: string;
  createdBy?: string;
  assignedUserIds?: string[];
  assignedTeamIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status?: ProjectStatus;
  deadline?: string;
  assignedUserIds?: string[];
  assignedTeamIds?: string[];
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ProjectsListPayload {
  total: number;
  projects: ProjectRecord[];
}

export const projectsService = {
  async getAll() {
    const response = await api.get<ApiEnvelope<ProjectsListPayload>>('/projects');
    return response.data.projects;
  },

  async getById(id: string) {
    const response = await api.get<ApiEnvelope<ProjectRecord>>(`/projects/${id}`);
    return response.data;
  },

  async create(dto: CreateProjectPayload) {
    const response = await api.post<ApiEnvelope<ProjectRecord>>('/projects', dto);
    return response.data;
  },

  async update(id: string, dto: UpdateProjectPayload) {
    const response = await api.put<ApiEnvelope<ProjectRecord>>(`/projects/${id}`, dto);
    return response.data;
  },

  async remove(id: string) {
    return api.delete<ApiEnvelope<{ id: string }>>(`/projects/${id}`);
  },
};
