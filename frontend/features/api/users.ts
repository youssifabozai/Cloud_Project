import { usersApiClient } from './client';

import type { PagedUsersResponse } from '../types/user.types';
import type { UpdateProfileDto, UserProfile } from '@/types';
import type { UpdateProfileApiResponse } from '../types/user.types';

export interface FetchUsersOptions {
  page?: number;
  size?: number;
  search?: string;
  role?: string;
}

export async function fetchUsers(options: FetchUsersOptions = {}): Promise<PagedUsersResponse> {
  const params: Partial<Record<'page' | 'size' | 'search' | 'role', number | string>> = {};
  if (options.page) params.page = options.page;
  if (options.size) params.size = options.size;
  if (options.search) params.search = options.search;
  if (options.role) params.role = options.role;

  const response = await usersApiClient.get<PagedUsersResponse>('/users', { params });
  return response.data;
}

export async function updateCurrentUserProfile(
  userId: string,
  payload: UpdateProfileDto,
): Promise<UserProfile> {
  const response = await usersApiClient.put<UpdateProfileApiResponse>(`/users/${userId}/profile`, payload);
  return response.data.data;
}
