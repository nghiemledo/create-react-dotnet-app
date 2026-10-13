import type { UserRole } from '@/types/permission.types';

const MANAGER_ROLES: UserRole[] = ['ADMIN', 'TEACHER'];

export function mapBackendRole(role?: string | null): UserRole {
  const normalized = (role ?? '').trim().toLowerCase();

  if (normalized === 'sysadmin' || normalized === 'admin') {
    return 'ADMIN';
  }

  if (normalized === 'teacher') {
    return 'TEACHER';
  }

  return 'STAFF';
}

export function canManageStudents(role?: UserRole | null) {
  return Boolean(role && MANAGER_ROLES.includes(role));
}
