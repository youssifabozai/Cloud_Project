import type { UserProfile } from '@/types';
import type { UserRole } from '@/types';

export interface CurrentUserResponse {
  userId: string;
  email: string;
  role: UserRole;
  teamId?: string;
  accessToken?: string;
  idToken?: string;
  profile: UserProfile;
}

export interface CurrentUserApiResponse {
  success: boolean;
  message: string;
  data: CurrentUserResponse;
}

export interface UserSummary {
  userId: string;
  email: string;
  role: UserRole;
  teamId?: string;
  profile?: Partial<UserProfile>;
}

export interface PagedUsersResponse {
  items: UserSummary[];
  total: number;
  page?: number;
  size?: number;
}

export interface UserSession {
  userId: string;
  name: string;
  email?: string;
  role: UserRole;
  teamId: string;
  accessToken?: string;
  idToken?: string;
  profile?: UserProfile;
  mode: 'api';
}

export interface UpdateProfileApiResponse {
  success: boolean;
  message: string;
  data: UserProfile;
}

export type UserSessionState =
  | { status: 'loading'; session: null }
  | { status: 'unauthorized' | 'forbidden'; session: null; reason: 'missing_token' | 'expired_token' | 'forbidden_access'; error?: string }
  | { status: 'authenticated'; session: UserSession };
