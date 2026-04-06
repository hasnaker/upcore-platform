/**
 * Common API contract primitives — error envelope, bulk results, empty responses.
 *
 * Note: `PaginationQuerySchema` and `paginatedResponseSchema` live in
 * `../schemas/base` and are re-exported from `@upcore/types` via the
 * schemas barrel. Import them from `@upcore/types` directly.
 */
import { z } from 'zod';

/** Standard API error envelope. */
export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  messageTr: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  traceId: z.string().min(1),
  statusCode: z.number().int().min(400).max(599).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export function isApiError(value: unknown): value is ApiError {
  return ApiErrorSchema.safeParse(value).success;
}

/** Bulk result envelope. */
export const BulkResultSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    succeeded: z.array(item),
    failed: z.array(
      z.object({
        index: z.number().int().nonnegative(),
        error: ApiErrorSchema,
      }),
    ),
    totalProcessed: z.number().int().nonnegative(),
    successCount: z.number().int().nonnegative(),
    failureCount: z.number().int().nonnegative(),
  });

/** Empty success response. */
export const EmptyResponseSchema = z.object({
  success: z.literal(true),
});
export type EmptyResponse = z.infer<typeof EmptyResponseSchema>;

/** Generic ID response. */
export const IdResponseSchema = z.object({
  id: z.string().uuid(),
});
export type IdResponse = z.infer<typeof IdResponseSchema>;
