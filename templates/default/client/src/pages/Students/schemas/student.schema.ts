import { z } from 'zod';

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;

export const studentSchema = z.object({
  studentCode: z
    .string()
    .trim()
    .min(3, 'Mã sinh viên phải có ít nhất 3 ký tự.')
    .max(30, 'Mã sinh viên không được vượt quá 30 ký tự.'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Vui lòng nhập họ và tên.')
    .max(120, 'Họ và tên không được vượt quá 120 ký tự.'),
  email: z.string().trim().email('Email không đúng định dạng.'),
  phone: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || phoneRegex.test(value), {
      message: 'Số điện thoại không đúng định dạng.',
    }),
  dateOfBirth: z.string().min(1, 'Vui lòng chọn ngày sinh.'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  classId: z.number().int().positive('Vui lòng chọn lớp học.'),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'GRADUATED']),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
