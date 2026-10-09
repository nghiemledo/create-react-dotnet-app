import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTE_PATHS } from '@/routes/routePaths';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/utils/handleApiError';
import { canManageStudents } from '@/utils/roles';
import { StudentForm } from './components/StudentForm';
import { isStudentId, useStudentDetailQuery } from './queries/useStudentDetailQuery';
import { useDeleteStudentMutation } from './queries/useDeleteStudentMutation';
import { useUpdateStudentMutation } from './queries/useUpdateStudentMutation';
import type { StudentFormValues } from './schemas/student.schema';

export default function StudentDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const studentId = isStudentId(params.id) ? params.id : null;
  const studentQuery = useStudentDetailQuery(studentId);
  const updateStudent = useUpdateStudentMutation();
  const deleteStudent = useDeleteStudentMutation();
  const canManage = canManageStudents(useAuthStore((state) => state.user?.role));
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (values: StudentFormValues) => {
    if (!studentId) return;

    setServerError(null);
    setSuccessMessage(null);
    updateStudent.mutate(
      { id: studentId, data: values },
      {
        onSuccess: () => setSuccessMessage('Cập nhật sinh viên thành công.'),
        onError: (error) => setServerError(getApiErrorMessage(error)),
      },
    );
  };

  const handleDelete = () => {
    if (!studentId || !studentQuery.data) return;
    if (!window.confirm(`Xóa sinh viên ${studentQuery.data.fullName}?`)) return;

    deleteStudent.mutate(studentId, {
      onSuccess: () => {
        navigate(ROUTE_PATHS.STUDENTS.LIST, {
          replace: true,
          state: { successMessage: 'Đã xóa sinh viên.' },
        });
      },
      onError: (error) => setServerError(getApiErrorMessage(error)),
    });
  };

  if (!studentId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
        ID sinh viên không hợp lệ.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate(ROUTE_PATHS.STUDENTS.LIST)}
            aria-label="Quay lại"
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Chi tiết sinh viên</h1>
            <p className="mt-1 text-sm text-slate-500">Xem, cập nhật hoặc xóa hồ sơ sinh viên.</p>
          </div>
        </div>

        {canManage && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={deleteStudent.isPending || !studentQuery.data}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 />
            Xóa
          </Button>
        )}
      </div>

      {studentQuery.isLoading && (
        <div className="grid min-h-56 place-items-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="size-4 animate-spin" />
            Đang tải thông tin sinh viên...
          </div>
        </div>
      )}

      {studentQuery.isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <p>{getApiErrorMessage(studentQuery.error)}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => studentQuery.refetch()}
          >
            Thử lại
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      {studentQuery.data && (
        <StudentForm
          initialValues={{
            studentCode: studentQuery.data.studentCode,
            fullName: studentQuery.data.fullName,
            email: studentQuery.data.email,
            phone: studentQuery.data.phone ?? '',
            dateOfBirth: studentQuery.data.dateOfBirth.slice(0, 10),
            gender: studentQuery.data.gender,
            classId: studentQuery.data.classId,
            status: studentQuery.data.status,
          }}
          submitLabel="Cập nhật sinh viên"
          isSubmitting={updateStudent.isPending}
          readOnly={!canManage}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={() => navigate(ROUTE_PATHS.STUDENTS.LIST)}
        />
      )}
    </div>
  );
}
