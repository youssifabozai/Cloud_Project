// ─────────────────────────────────────────────────────────────
//  Base API Client — Mini-Jira AWS
//  Central fetch wrapper with auth headers, error handling,
//  and cookie/token forwarding.
// ─────────────────────────────────────────────────────────────

import type { ApiError } from '@/types';

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export class ApiRequestError extends Error {
  status: number;
  data: ApiError | null;

  constructor(message: string, status: number, data: ApiError | null = null) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.data = data;
  }
}

// Token storage removed to prefer HttpOnly cookie-based sessions.
// The backend should set cookies; the client will send them via `credentials: 'include'`.

/**
 * Core fetch wrapper.
 * - Attaches Bearer token from localStorage session
 * - Sends credentials (cookies) for httpOnly cookie auth
 * - Parses JSON responses
 * - Throws ApiRequestError on non-2xx
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Remove Content-Type for FormData (browser sets multipart boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // send httpOnly cookies
  });

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errMsg =
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(', ')
          : `Request failed with status ${res.status}`;
    throw new ApiRequestError(errMsg, res.status, data);
  }

  return data as T;
}

// ─── HTTP Method Shortcuts ────────────────────────────────────
export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),

  /** Upload file via multipart/form-data */
  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, { method: 'POST', body: formData }),
};

export { API_BASE_URL };
export default api;
