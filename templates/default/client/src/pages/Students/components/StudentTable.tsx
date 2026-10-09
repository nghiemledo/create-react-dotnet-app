import { Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/formatDate';
import type { Student, StudentStatus } from '../types/student.types';

interface StudentTableProps {
  students: Student[];
  isFetching?: boolean;
  onView: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

const statusLabels: Record<StudentStatus, string> = {
  ACTIVE: 'Đang học',
  SUSPENDED: 'Tạm dừng',
  GRADUATED: 'Tốt nghiệp',
};

const statusClasses: Record<StudentStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  SUSPENDED: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  GRADUATED: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
};

export function StudentTable({
  students,
  isFetching = false,
  onView,
  onDelete,
}: StudentTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 font-medium">Sinh viên</th>
              <th className="px-4 py-3 font-medium">Mã SV</th>
              <th className="px-4 py-3 font-medium">Lớp</th>
              <th className="px-4 py-3 font-medium">Ngày sinh</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-100 dark:divide-slate-800 ${isFetching ? 'opacity-60' : ''}`}>
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <p className="font-medium">{student.fullName}</p>
                  <p className="text-xs text-slate-500">{student.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{student.studentCode}</td>
                <td className="px-4 py-3">{student.className ?? `#${student.classId}`}</td>
                <td className="px-4 py-3">{formatDate(student.dateOfBirth)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[student.status]}`}>
                    {statusLabels[student.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onView(student)}
                      aria-label={`Xem ${student.fullName}`}
                    >
                      <Eye />
                    </Button>
                    {onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(student)}
                        aria-label={`Xóa ${student.fullName}`}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-slate-500">
          Không tìm thấy sinh viên phù hợp.
        </div>
      )}
    </div>
  );
}
