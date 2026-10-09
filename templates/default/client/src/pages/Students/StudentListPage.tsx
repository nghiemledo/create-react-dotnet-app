import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { appConfig } from '@/config/appConfig';
import { ROUTE_PATHS } from '@/routes/routePaths';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/utils/handleApiError';
import { canManageStudents } from '@/utils/roles';
import { StudentFilter } from './components/StudentFilter';
import { StudentTable } from './components/StudentTable';
import { useDeleteStudentMutation } from './queries/useDeleteStudentMutation';
import { useStudentsQuery } from './queries/useStudentsQuery';
import type {
  Student,
  StudentFilter as StudentFilterValue,
  StudentStatus,
} from './types/student.types';

interface LocationState {
  successMessage?: string;
}

const toPositiveInteger = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export default function StudentListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const filter = useMemo<StudentFilterValue>(() => {
    const statusValue = searchParams.get('status');
    const isStudentStatus =
      statusValue === 'ACTIVE' ||
      statusValue === 'SUSPENDED' ||
      statusValue === 'GRADUATED';

    return {
      page: toPositiveInteger(searchParams.get('page'), appConfig.pagination.defaultPage),
      pageSize: toPositiveInteger(
        searchParams.get('pageSize'),
        appConfig.pagination.defaultPageSize,
      ),
      keyword: searchParams.get('keyword') || undefined,
      classId: searchParams.get('classId')
        ? toPositiveInteger(searchParams.get('classId'), 1)
        : undefined,
      status: isStudentStatus ? (statusValue as StudentStatus) : undefined,
    };
  }, [searchParams]);

  const studentsQuery = useStudentsQuery(filter);
  const deleteStudent = useDeleteStudentMutation();
  const canManage = canManageStudents(useAuthStore((state) => state.user?.role));
  const state = location.state as LocationState | null;

  const updateSearchParams = (nextValues: Record<string, string | number | undefined>) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    setSearchParams(nextParams);
  };

  const handleFilter = (
    nextFilter: Pick<StudentFilterValue, 'keyword' | 'classId' | 'status'>,
  ) => {
    updateSearchParams({ ...nextFilter, page: 1 });
  };

  const handleReset = () => {
    setSearchParams({
      page: String(appConfig.pagination.defaultPage),
      pageSize: String(filter.pageSize),
    });
  };

  const handleView = (student: Student) => {
    navigate(ROUTE_PATHS.STUDENTS.DETAIL(student.id));
  };

  const handleDelete = (student: Student) => {
    if (!window.confirm(`Xóa sinh viên ${student.fullName}?`)) return;
    deleteStudent.mutate(student.id);
  };

  const paging = studentsQuery.data;
  const totalPages = Math.max(paging?.totalPages ?? 1, 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Quản lý sinh viên</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bộ lọc và phân trang được lưu trên URL; dữ liệu được cache bằng React Query.
          </p>
        </div>

        {canManage && (
          <Button type="button" onClick={() => navigate(ROUTE_PATHS.STUDENTS.CREATE)}>
            <Plus />
            Thêm sinh viên
          </Button>
        )}
      </div>

      {state?.successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {state.successMessage}
        </div>
      )}

      <StudentFilter
        // Remount when the URL filter changes so the form fields reset to it.
        key={`${filter.keyword ?? ''}|${filter.classId ?? ''}|${filter.status ?? ''}`}
        value={filter}
        disabled={studentsQuery.isFetching}
        onSubmit={handleFilter}
        onReset={handleReset}
      />

      {studentsQuery.isLoading && (
        <div className="grid min-h-56 place-items-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="size-4 animate-spin" />
            Đang tải danh sách sinh viên...
          </div>
        </div>
      )}

      {studentsQuery.isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-medium">Không thể tải danh sách sinh viên.</p>
          <p className="mt-1">{getApiErrorMessage(studentsQuery.error)}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => studentsQuery.refetch()}
          >
            Thử lại
          </Button>
        </div>
      )}

      {studentsQuery.data && (
        <>
          <StudentTable
            students={studentsQuery.data.items}
            isFetching={studentsQuery.isFetching}
            onView={handleView}
            onDelete={canManage ? handleDelete : undefined}
          />

          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-500">
              Trang {paging?.page ?? filter.page}/{totalPages} · Tổng{' '}
              {paging?.totalItems ?? 0} sinh viên
            </p>

            <div className="flex items-center gap-2">
              <select
                value={filter.pageSize}
                onChange={(event) =>
                  updateSearchParams({ pageSize: Number(event.target.value), page: 1 })
                }
                className="h-9 rounded-xl border border-slate-300 bg-transparent px-2 dark:border-slate-700"
                aria-label="Số dòng mỗi trang"
              >
                {appConfig.pagination.pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} dòng
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={filter.page <= 1 || studentsQuery.isFetching}
                onClick={() => updateSearchParams({ page: filter.page - 1 })}
                aria-label="Trang trước"
              >
                <ChevronLeft />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={filter.page >= totalPages || studentsQuery.isFetching}
                onClick={() => updateSearchParams({ page: filter.page + 1 })}
                aria-label="Trang sau"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
