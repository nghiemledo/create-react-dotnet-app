import { StudentCreateView } from '@/features/students/views/StudentCreateView';
import { RoleRoute } from '@/routes/RoleRoute';

export default function StudentCreatePage() {
  return (
    <RoleRoute allowedRoles={['ADMIN', 'TEACHER']}>
      <StudentCreateView />
    </RoleRoute>
  );
}
