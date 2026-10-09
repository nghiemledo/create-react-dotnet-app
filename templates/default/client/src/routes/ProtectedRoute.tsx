import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTE_PATHS } from './routePaths';

export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTE_PATHS.AUTH.LOGIN}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
};
