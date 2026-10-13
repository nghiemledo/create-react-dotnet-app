'use client';

import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ROUTE_PATHS } from '@/routes/routePaths';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/utils/handleApiError';
import { canManageStudents } from '@/utils/roles';
import { StudentForm } from '../components/StudentForm';
import { NOTICE_PARAM } from '../notices';
import { useCreateStudentMutation } from '../queries/useCreateStudentMutation';
import type { StudentFormValues } from '../schemas/student.schema';

export function StudentCreateView() {
  const router = useRouter();
  const createStudent = useCreateStudentMutation();
  const canManage = canManageStudents(useAuthStore((state) => state.user?.role));
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) {
      router.replace(ROUTE_PATHS.STUDENTS.LIST);
    }
  }, [canManage, router]);

  if (!canManage) {
    return null;
  }

  const handleSubmit = (values: StudentFormValues) => {
    setServerError(null);

    createStudent.mutate(values, {
      onSuccess: () => {
        router.replace(`${ROUTE_PATHS.STUDENTS.LIST}?${NOTICE_PARAM}=created`);
      },
      onError: (error) => setServerError(getApiErrorMessage(error)),
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => router.push(ROUTE_PATHS.STUDENTS.LIST)}
          aria-label="Quay lại"
        >
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Thêm sinh viên</h1>
          <p className="mt-1 text-sm text-slate-500">
            Form được quản lý bằng React Hook Form và kiểm tra bằng Zod.
          </p>
        </div>
      </div>

      <StudentForm
        isSubmitting={createStudent.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        onCancel={() => router.push(ROUTE_PATHS.STUDENTS.LIST)}
      />
    </div>
  );
}
