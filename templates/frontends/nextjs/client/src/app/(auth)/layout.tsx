import { Suspense, type PropsWithChildren } from 'react';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { GuestRoute } from '@/routes/GuestRoute';

export default function AuthGroupLayout({ children }: PropsWithChildren) {
  return (
    <AuthLayout>
      <Suspense>
        <GuestRoute>{children}</GuestRoute>
      </Suspense>
    </AuthLayout>
  );
}
