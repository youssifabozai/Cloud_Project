import api from './api';
import type { UserProfile, UpdateProfileDto } from '@/types';

export interface OrgChartUserNode {
  userId: string;
  fullName: string | null;
  email: string;
  role: UserProfile['role'];
  teamId: string | null;
  avatar: string | null;
  name?: string;
  phoneNumber?: string | null;
}

export interface OrgChartTeamNode {
  teamId: string;
  name: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  members: OrgChartUserNode[];
}

export interface OrgChartSummary {
  totalAdmins: number;
  totalManagers: number;
  totalTeams: number;
  totalEmployees: number;
}

export interface OrgChartFullData {
  scope: 'ALL';
  summary: OrgChartSummary;
  admins: OrgChartUserNode[];
  managers: OrgChartUserNode[];
  teams: OrgChartTeamNode[];
  unassignedEmployees: OrgChartUserNode[];
}

export interface OrgChartRestrictedData {
  scope: 'TEAM';
  team: {
    teamId: string;
    name: string;
    description: string | null;
  } | null;
  members: OrgChartUserNode[];
}

export type OrgChartData = OrgChartFullData | OrgChartRestrictedData;

export interface OrgChartApiResponse {
  success: boolean;
  message: string;
  data: OrgChartData;
}

export interface AssignTeamApiResponse {
  success: boolean;
  message: string;
  data: UserProfile;
}

export interface UpdateRoleApiResponse {
  success: boolean;
  message: string;
  data: UserProfile;
}

export interface DeleteUserApiResponse {
  success: boolean;
  message: string;
}

type UsersListResponse = {
  success: boolean;
  message: string;
  data: {
    scope: string;
    total: number;
    users: UserProfile[];
  };
};

export const usersService = {
  getAll: async () => {
    const res = await api.get<UsersListResponse>('/users');
    return res.data?.users ?? [];
  },
  getMe: () => api.get<UserProfile>('/users/me'),
  getByTeam: async (teamId: string): Promise<UserProfile[]> => {
    const res = await api.get<{
      success?: boolean;
      data?: { users?: UserProfile[] };
      users?: UserProfile[];
    }>(`/users/team/${encodeURIComponent(teamId)}`);
    const list = res.data?.users ?? res.users ?? [];
    return Array.isArray(list) ? list : [];
  },
  getOrgChart: () => api.get<OrgChartApiResponse>('/users/org-chart'),
  assignTeam: (userId: string, teamId: string) =>
    api.put<AssignTeamApiResponse>(`/users/${userId}/team`, { teamId }),
  updateRole: (userId: string, role: UserProfile['role']) =>
    api.put<UpdateRoleApiResponse>(`/users/${userId}/role`, { role }),
  deleteUser: (userId: string) =>
    api.delete<DeleteUserApiResponse>(`/users/${userId}`),
  updateProfile: (id: string, dto: UpdateProfileDto) =>
    api.put<UserProfile>(`/users/${id}/profile`, dto),
  remove: (id: string) => api.delete<{ success: boolean }>(`/users/${id}`),
};
