import { z } from 'zod';

export interface PagedResponse<T> {
  page: number;
  pageSize: number;
  total: number;
  data: T[];
}

export interface MutationResponse {
  id?: number | string;
  affected?: number;
  data?: unknown;
}

export const PageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
  q: z.string().trim().min(1).optional(),
});

export type PageQuery = z.infer<typeof PageQuerySchema>;

export function toPagedResponse<T>(page: number, pageSize: number, total: number, data: T[]): PagedResponse<T> {
  return { page, pageSize, total, data };
}
