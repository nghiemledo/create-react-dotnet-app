import type { PagingParams } from '@/types/paging.types';

export type StudentGender = 'MALE' | 'FEMALE' | 'OTHER';
export type StudentStatus = 'ACTIVE' | 'SUSPENDED' | 'GRADUATED';

export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  phone?: string | null;
  dateOfBirth: string;
  gender: StudentGender;
  classId: number;
  className?: string | null;
  status: StudentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentFilter extends PagingParams {
  keyword?: string;
  classId?: number;
  status?: StudentStatus;
}

export interface StudentUpsertRequest {
  studentCode: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  gender: StudentGender;
  classId: number;
  status: StudentStatus;
}
