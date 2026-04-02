export type ApiResponse<T> = {
  success: true;
  data: T;
  meta?: PaginationMeta;
} | {
  success: false;
  error: { code: string; message: string };
};

export type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type SessionUser = {
  id: string;
  username: string;
  role: string;
  karma: number;
};
