import { Suspense } from 'react';
import { StudentListView } from '@/features/students/views/StudentListView';

export default function StudentListPage() {
  return (
    <Suspense>
      <StudentListView />
    </Suspense>
  );
}
