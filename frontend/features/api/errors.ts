import axios from 'axios';

import type { ApiError } from '@/types';

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details: ApiError | null;

  constructor(message: string, status = 0, details: ApiError | null = null, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function getApiErrorMessage(error: unknown, fallback = 'Unexpected API error'): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (axios.isAxiosError<ApiError>(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string') {
      return responseMessage;
    }

    if (Array.isArray(responseMessage) && responseMessage.length > 0) {
      return responseMessage.join(', ');
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError<ApiError>(error)) {
    const details = error.response?.data ?? null;
    const responseMessage = details?.message;
    const message =
      typeof responseMessage === 'string'
        ? responseMessage
        : Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : error.message || 'Request failed';

    return new ApiClientError(message, error.response?.status ?? 0, details, error.code);
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message, 0, null);
  }

  return new ApiClientError('Unexpected API error', 0, null);
}