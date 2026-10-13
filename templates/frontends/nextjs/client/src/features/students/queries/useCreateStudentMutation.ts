import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../services/studentApi';
import { studentKeys } from './student.queryKeys';

export function useCreateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: studentApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
    },
  });
}
