import { usersApiClient } from './client';

import type { PagedUsersResponse } from '../types/user.types';

export interface FetchUsersOptions {
  page?: number;
  size?: number;
  search?: string;
  role?: string;
}

export async function fetchUsers(options: FetchUsersOptions = {}): Promise<PagedUsersResponse> {
  const params: Record<string, any> = {};
  if (options.page) params.page = options.page;
  if (options.size) params.size = options.size;
  if (options.search) params.search = options.search;
  if (options.role) params.role = options.role;

  const response = await usersApiClient.get<PagedUsersResponse>('/users', { params });
  return response.data;
}
