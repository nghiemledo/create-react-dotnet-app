const parsePositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Next.js only inlines NEXT_PUBLIC_* variables that are referenced literally, so keep each access explicit.
export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Hệ thống quản lý đào tạo',
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://localhost:7001',
  apiTimeout: parsePositiveNumber(process.env.NEXT_PUBLIC_API_TIMEOUT, 15_000),
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;
