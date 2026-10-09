/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError } from 'axios';
import { env } from '@/config/env';
import { useAuthStore } from '@/store/authStore';
import type { ApiError } from '@/types/api.types';

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: any) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response: any) => response,
  (error: AxiosError<{
    message?: string;
    messages?: string[];
    errors?: Record<string, string[]>;
  }>) => {
    const status = error.response?.status ?? 0;
    const apiError: ApiError = {
      status,
      message:
        error.response?.data?.messages?.[0] ??
        error.response?.data?.message ??
        (status === 0
          ? 'Không thể kết nối đến máy chủ.'
          : 'Đã xảy ra lỗi khi xử lý yêu cầu.'),
      errors: error.response?.data?.errors,
    };

    if (status === 401) {
      const requestUrl = error.config?.url ?? '';
      const isAuthAttempt =
        requestUrl.includes('/v1/auth/login') || requestUrl.includes('/v1/auth/register');

      if (!isAuthAttempt) {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(apiError);
  },
);
