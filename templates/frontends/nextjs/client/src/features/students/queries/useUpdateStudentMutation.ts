import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../services/studentApi';
import type { StudentUpsertRequest } from '../types/student.types';
import { studentKeys } from './student.queryKeys';

interface UpdateStudentInput {
  id: string;
  data: StudentUpsertRequest;
}

export function useUpdateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateStudentInput) => studentApi.update(id, data),
    onSuccess: async (student) => {
      queryClient.setQueryData(studentKeys.detail(student.id), student);
      await queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
    },
  });
}
