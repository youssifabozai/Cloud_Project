import { usersApiClient } from './client';

import type { CurrentUserApiResponse, CurrentUserResponse } from '../types';

export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  const response = await usersApiClient.get<CurrentUserApiResponse>('/users/me');
  return response.data.data;
}