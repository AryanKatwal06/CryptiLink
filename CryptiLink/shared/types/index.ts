export type AppResult<T> = { ok: true; value: T } | { ok: false; error: AppError };

export interface ApiResponse<T> {
  data?: T;
  error?: AppError;
  meta?: { [key: string]: unknown };
}

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EventEnvelope<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: string;
}

export interface SessionModel {
  sessionId: string;
  userId?: string;
  createdAt: string;
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}
