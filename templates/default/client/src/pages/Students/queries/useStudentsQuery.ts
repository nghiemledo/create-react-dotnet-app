import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../services/studentApi';
import type { StudentFilter } from '../types/student.types';
import { studentKeys } from './student.queryKeys';

export function useStudentsQuery(filter: StudentFilter) {
  return useQuery({
    queryKey: studentKeys.list(filter),
    queryFn: () => studentApi.getList(filter),
    placeholderData: (previousData) => previousData,
  });
}
