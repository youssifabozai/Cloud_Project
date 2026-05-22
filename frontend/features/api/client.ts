import axios, { AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { normalizeApiError } from './errors';
import { getStoredAccessToken } from '../utils/session';

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

function applyBearerToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = getStoredAccessToken();

  if (!token) {
    return config;
  }

  const headers = config.headers instanceof AxiosHeaders
    ? config.headers
    : new AxiosHeaders(config.headers);

  headers.set('Authorization', `Bearer ${token}`);
  config.headers = headers;

  return config;
}

export function createUsersApiClient(baseURL: string = DEFAULT_BASE_URL): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(applyBearerToken);
  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(normalizeApiError(error)),
  );

  return client;
}

export const usersApiClient = createUsersApiClient();