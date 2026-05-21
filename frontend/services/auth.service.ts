import api from './api';
import type { LoginDto, LoginResponse, CreateUserDto } from '@/types';

export const authService = {
  /** Authenticate via AWS Cognito — returns tokens + user profile */
  login: (dto: LoginDto) =>
    api.post<LoginResponse>('/auth/login', dto),

  /** Fetch current session/profile when using cookie-based auth */
  getSession: () =>
    api.get<{ user: any }>('/auth/me'),

  /** Sign out all Cognito sessions globally */
  logout: () =>
    api.post<{ success: boolean; message: string }>('/auth/logout', {}),

  /** Manager/Admin only: create a new Cognito + DynamoDB user */
  createUser: (dto: CreateUserDto) =>
    api.post<{ success: boolean; data: unknown }>('/auth/create-user', dto),
};
