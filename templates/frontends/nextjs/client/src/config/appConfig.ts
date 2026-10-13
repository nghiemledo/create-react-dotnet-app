import { env } from './env';

export const appConfig = {
  name: env.appName,
  pagination: {
    defaultPage: 1,
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50],
  },
  endpoints: {
    students: '/v1/students',
    auth: '/v1/auth',
  },
} as const;
