const parsePositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? 'Hệ thống quản lý đào tạo',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7001',
  apiTimeout: parsePositiveNumber(import.meta.env.VITE_API_TIMEOUT, 15_000),
  isDevelopment: import.meta.env.DEV,
} as const;
