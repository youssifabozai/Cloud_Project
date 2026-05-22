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

type TeamsListResponse = {
  success: boolean;
  message: string;
  data: {
    scope: string;
    total: number;
    teams: Team[];
  };
};

export const teamsService = {
  getAll: async () => {
    const res = await api.get<TeamsListResponse>('/teams');
    return res.data?.teams ?? [];
  },
  getById: (teamId: string) => api.get<Team>(`/teams/${teamId}`),
  create: (dto: CreateTeamDto) => api.post<Team>('/teams', dto),
  remove: (teamId: string) => api.delete<{ success: boolean }>(`/teams/${teamId}`),
};
