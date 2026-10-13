'use client';

import { useEffect, type PropsWithChildren } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useHydrated } from '@/hooks/useHydrated';
import { useAuthStore } from '@/store/authStore';
import { loginPath } from './navigation';

export function FullPageLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
      <RefreshCw className="size-5 animate-spin text-slate-400" aria-label="Đang tải" />
    </div>
  );
}

/** Browser-side guard: the access token lives in localStorage, so the server cannot check it. */
export function ProtectedRoute({ children }: PropsWithChildren) {
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(loginPath(pathname));
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated || !isAuthenticated) {
    return <FullPageLoading />;
  }

  return children;
}
