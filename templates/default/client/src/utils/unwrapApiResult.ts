import type { ApiError, ApiResponse } from '@/types/api.types';

type BackendResult<T> = {
  status?: boolean;
  success?: boolean;
  messages?: string[];
  message?: string;
  data: T;
};

export type ApiPayload<T> = T | ApiResponse<T> | BackendResult<T>;

export function unwrapApiResult<T>(payload: ApiPayload<T>): T {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    ('status' in payload || 'success' in payload)
  ) {
    const result = payload as BackendResult<T>;
    if (result.status === false || result.success === false) {
      const error: ApiError = {
        status: 400,
        message: result.messages?.[0] ?? result.message ?? 'Yêu cầu thất bại.',
      };
      throw error;
    }

    return result.data;
  }

  return payload as T;
}
