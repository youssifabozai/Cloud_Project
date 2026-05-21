import api from './api';

export interface Team {
  teamId: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt?: string;
}

export interface CreateTeamDto {
  name: string;
  description?: string;
}

export const teamsService = {
  getAll: () =>
    api.get<Team[]>('/teams'),

  getById: (teamId: string) =>
    api.get<Team>(`/teams/${teamId}`),

  create: (dto: CreateTeamDto) =>
    api.post<Team>('/teams', dto),

  remove: (teamId: string) =>
    api.delete<{ success: boolean }>(`/teams/${teamId}`),
};
