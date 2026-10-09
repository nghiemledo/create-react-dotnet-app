import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../services/studentApi';
import { studentKeys } from './student.queryKeys';

export function useDeleteStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: studentApi.remove,
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: studentKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
    },
  });
}
