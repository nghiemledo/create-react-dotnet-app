import type { PropsWithChildren } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

export default function MainGroupLayout({ children }: PropsWithChildren) {
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}
