export interface PagingParams {
  page: number;
  pageSize: number;
}

export interface PagingResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
