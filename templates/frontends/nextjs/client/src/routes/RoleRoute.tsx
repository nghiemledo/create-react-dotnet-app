'use client';

import { useEffect, type PropsWithChildren } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/permission.types';
import { ROUTE_PATHS } from './routePaths';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

/** Used inside ProtectedRoute, so the auth store has already been restored. */
export function RoleRoute({ allowedRoles, children }: PropsWithChildren<RoleRouteProps>) {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const allowed = !!user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!allowed) {
      router.replace(ROUTE_PATHS.DASHBOARD);
    }
  }, [allowed, router]);

  return allowed ? children : null;
}
