import api from './api';
import type { UserProfile, UpdateProfileDto } from '@/types';

export const usersService = {
  getAll:       ()                                          => api.get<UserProfile[]>('/users'),
  getMe:        ()                                          => api.get<UserProfile>('/users/me'),
  getByTeam:    (teamId: string)                            => api.get<UserProfile[]>(`/users/team/${teamId}`),
  updateProfile:(id: string, dto: UpdateProfileDto)         => api.put<UserProfile>(`/users/${id}/profile`, dto),
  remove:       (id: string)                                => api.delete<{ success: boolean }>(`/users/${id}`),
};
