import type { ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  studentSchema,
  type StudentFormValues,
} from '../schemas/student.schema';

interface StudentFormProps {
  initialValues?: Partial<StudentFormValues>;
  submitLabel?: string;
  isSubmitting?: boolean;
  readOnly?: boolean;
  serverError?: string | null;
  onSubmit: (values: StudentFormValues) => void;
  onCancel: () => void;
}

const defaultValues: StudentFormValues = {
  studentCode: '',
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: 'MALE',
  classId: 1,
  status: 'ACTIVE',
};

export function StudentForm({
  initialValues,
  submitLabel = 'Lưu sinh viên',
  isSubmitting = false,
  readOnly = false,
  serverError,
  onSubmit,
  onCancel,
}: StudentFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: { ...defaultValues, ...initialValues },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {serverError}
        </div>
      )}

      <fieldset disabled={readOnly || isSubmitting} className="grid gap-5 border-0 p-0 md:grid-cols-2">
        <Field label="Mã sinh viên" error={errors.studentCode?.message}>
          <input
            {...register('studentCode')}
            className="form-input"
            placeholder="VD: SV2026001"
          />
        </Field>

        <Field label="Họ và tên" error={errors.fullName?.message}>
          <input
            {...register('fullName')}
            className="form-input"
            placeholder="Nguyễn Văn An"
          />
        </Field>

        <Field label="Email" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            className="form-input"
            placeholder="student@school.edu.vn"
          />
        </Field>

        <Field label="Số điện thoại" error={errors.phone?.message}>
          <input
            {...register('phone')}
            className="form-input"
            placeholder="0901234567"
          />
        </Field>

        <Field label="Ngày sinh" error={errors.dateOfBirth?.message}>
          <input {...register('dateOfBirth')} type="date" className="form-input" />
        </Field>

        <Field label="Giới tính" error={errors.gender?.message}>
          <select {...register('gender')} className="form-input">
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
        </Field>

        <Field label="ID lớp học" error={errors.classId?.message}>
          <Controller
            control={control}
            name="classId"
            render={({ field }) => (
              <input
                type="number"
                min={1}
                className="form-input"
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value))}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </Field>

        <Field label="Trạng thái" error={errors.status?.message}>
          <select {...register('status')} className="form-input">
            <option value="ACTIVE">Đang học</option>
            <option value="SUSPENDED">Tạm dừng</option>
            <option value="GRADUATED">Đã tốt nghiệp</option>
          </select>
        </Field>
      </fieldset>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {readOnly ? 'Quay lại' : 'Hủy'}
        </Button>
        {!readOnly && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu...' : submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

function Field({ label, error, children }: FieldProps) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error && <span className="block text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
}
