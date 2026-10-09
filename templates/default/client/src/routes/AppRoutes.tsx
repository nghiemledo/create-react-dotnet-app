import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { MainLayout } from '@/components/layouts/MainLayout';
import LoginPage from '@/pages/Auth/LoginPage';
import RegisterPage from '@/pages/Auth/RegisterPage';
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import StudentCreatePage from '@/pages/Students/StudentCreatePage';
import StudentDetailPage from '@/pages/Students/StudentDetailPage';
import StudentListPage from '@/pages/Students/StudentListPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { ROUTE_PATHS } from './routePaths';

export const AppRoutes = () => (
  <Routes>
    <Route element={<AuthLayout />}>
      <Route path={ROUTE_PATHS.AUTH.LOGIN} element={<LoginPage />} />
      <Route path={ROUTE_PATHS.AUTH.REGISTER} element={<RegisterPage />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<MainLayout />}>
        <Route path={ROUTE_PATHS.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTE_PATHS.STUDENTS.LIST} element={<StudentListPage />} />
        <Route path="/students/:id" element={<StudentDetailPage />} />

        <Route element={<RoleRoute allowedRoles={['ADMIN', 'TEACHER']} />}>
          <Route path={ROUTE_PATHS.STUDENTS.CREATE} element={<StudentCreatePage />} />
        </Route>
      </Route>
    </Route>

    <Route path="/" element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
    <Route path="*" element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
  </Routes>
);
