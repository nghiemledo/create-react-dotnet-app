'use client';

import { useEffect, type PropsWithChildren } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import { useAuthStore } from '@/store/authStore';
import { isSafeReturnPath } from './navigation';
import { ROUTE_PATHS } from './routePaths';

/**
 * Sends signed-in users away from the login and register pages: to `?from=` after signing in,
 * otherwise to the dashboard. Must be rendered inside <Suspense> because it reads the search params.
 */
export function GuestRoute({ children }: PropsWithChildren) {
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const from = useSearchParams().get('from');

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace(isSafeReturnPath(from) ? from : ROUTE_PATHS.DASHBOARD);
    }
  }, [from, hydrated, isAuthenticated, router]);

  if (hydrated && isAuthenticated) {
    return null;
  }

  return children;
}
