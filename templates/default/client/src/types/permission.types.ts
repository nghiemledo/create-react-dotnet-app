export type UserRole = 'ADMIN' | 'TEACHER' | 'STAFF';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}
