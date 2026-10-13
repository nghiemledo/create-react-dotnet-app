import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../services/studentApi';
import { studentKeys } from './student.queryKeys';

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isStudentId(id: string | undefined): id is string {
  return Boolean(id && GUID_PATTERN.test(id));
}

export function useStudentDetailQuery(id: string | null) {
  return useQuery({
    queryKey: studentKeys.detail(id ?? ''),
    queryFn: () => studentApi.getById(id as string),
    enabled: isStudentId(id ?? undefined),
  });
}
