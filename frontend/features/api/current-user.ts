import { usersApiClient } from './client';

import type { CurrentUserResponse } from '../types';

export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  const response = await usersApiClient.get<CurrentUserResponse>('/users/me');
  return response.data;
}