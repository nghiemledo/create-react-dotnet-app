import { appConfig } from '@/config/appConfig';
import { apiClient } from '@/lib/apiClient';
import type { PagingResponse } from '@/types/paging.types';
import { unwrapApiResult, type ApiPayload } from '@/utils/unwrapApiResult';
import type {
  Student,
  StudentFilter,
  StudentUpsertRequest,
} from '../types/student.types';

export const studentApi = {
  async getList(filter: StudentFilter) {
    const response = await apiClient.get<ApiPayload<PagingResponse<Student>>>(
      appConfig.endpoints.students,
      {
        params: {
          page: filter.page,
          pageSize: filter.pageSize,
          keyword: filter.keyword || undefined,
          classId: filter.classId,
          status: filter.status,
        },
      },
    );

    return unwrapApiResult(response.data);
  },

  async getById(id: string) {
    const response = await apiClient.get<ApiPayload<Student>>(
      `${appConfig.endpoints.students}/${id}`,
    );

    return unwrapApiResult(response.data);
  },

  async create(data: StudentUpsertRequest) {
    const response = await apiClient.post<ApiPayload<Student>>(
      appConfig.endpoints.students,
      data,
    );

    return unwrapApiResult(response.data);
  },

  async update(id: string, data: StudentUpsertRequest) {
    const response = await apiClient.put<ApiPayload<Student>>(
      `${appConfig.endpoints.students}/${id}`,
      data,
    );

    return unwrapApiResult(response.data);
  },

  async remove(id: string) {
    const response = await apiClient.delete<ApiPayload<string>>(
      `${appConfig.endpoints.students}/${id}`,
    );
    unwrapApiResult(response.data);
  },
};
