import type { PropsWithChildren } from 'react';
import { appConfig } from '@/config/appConfig';

export const AuthLayout = ({ children }: PropsWithChildren) => (
  <div className="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-12">
    <div className="hidden flex-col justify-between bg-zinc-950 p-10 text-white lg:col-span-5 lg:flex">
      <div className="flex items-center gap-3 text-lg font-semibold">
        <div className="h-8 w-8 rounded-xl bg-blue-600" />
        <span>{appConfig.name}</span>
      </div>
      <div className="space-y-4">
        <p className="max-w-lg text-2xl font-semibold leading-tight">
          Quản lý sinh viên, lớp học và kết quả đào tạo trên một hệ thống thống nhất.
        </p>
        <p className="text-sm text-zinc-400">
          Next.js, TypeScript, TanStack React Query, Zustand và .NET Web API.
        </p>
      </div>
    </div>

    <div className="col-span-1 flex items-center justify-center p-6 lg:col-span-7 lg:p-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  </div>
);
