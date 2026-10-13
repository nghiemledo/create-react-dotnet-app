import { useState, type FormEvent } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudentFilter as StudentFilterValue, StudentStatus } from '../types/student.types';

interface StudentFilterProps {
  value: StudentFilterValue;
  disabled?: boolean;
  onSubmit: (nextFilter: Pick<StudentFilterValue, 'keyword' | 'classId' | 'status'>) => void;
  onReset: () => void;
}

export function StudentFilter({
  value,
  disabled = false,
  onSubmit,
  onReset,
}: StudentFilterProps) {
  const [keyword, setKeyword] = useState(value.keyword ?? '');
  const [classId, setClassId] = useState(value.classId?.toString() ?? '');
  const [status, setStatus] = useState<StudentStatus | ''>(value.status ?? '');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      keyword: keyword.trim() || undefined,
      classId: classId ? Number(classId) : undefined,
      status: status || undefined,
    });
  };

  const handleReset = () => {
    setKeyword('');
    setClassId('');
    setStatus('');
    onReset();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_160px_180px_auto] dark:border-slate-800 dark:bg-slate-900"
    >
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Mã, tên hoặc email sinh viên"
          className="h-10 w-full rounded-xl border border-slate-300 bg-transparent pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
        />
      </label>

      <input
        type="number"
        min={1}
        value={classId}
        onChange={(event) => setClassId(event.target.value)}
        placeholder="ID lớp"
        className="h-10 rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
      />

      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as StudentStatus | '')}
        className="h-10 rounded-xl border border-slate-300 bg-transparent px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="ACTIVE">Đang học</option>
        <option value="SUSPENDED">Tạm dừng</option>
        <option value="GRADUATED">Đã tốt nghiệp</option>
      </select>

      <div className="flex gap-2">
        <Button type="submit" disabled={disabled} className="flex-1">
          Lọc
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleReset}
          disabled={disabled}
          aria-label="Xóa bộ lọc"
        >
          <RotateCcw />
        </Button>
      </div>
    </form>
  );
}
