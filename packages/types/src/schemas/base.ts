/**
 * Base schemas shared across all entities.
 */
import { z } from 'zod';

/** ISO-8601 date-time string (e.g. "2026-04-04T10:00:00Z"). */
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

/** ISO-8601 date string (YYYY-MM-DD). */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Tarih YYYY-MM-DD formatında olmalıdır',
});
export type IsoDate = z.infer<typeof IsoDateSchema>;

/** Common timestamp fields present on every persisted entity. */
export const TimestampsSchema = z.object({
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  deletedAt: IsoDateTimeSchema.nullable(),
});
export type Timestamps = z.infer<typeof TimestampsSchema>;

/** Minimum for any entity: id + timestamps. */
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  ...TimestampsSchema.shape,
});
export type BaseEntity = z.infer<typeof BaseEntitySchema>;

/** Entity scoped to a tenant. */
export const TimestampedEntitySchema = BaseEntitySchema.extend({
  tenantId: z.string().uuid(),
});
export type TimestampedEntity = z.infer<typeof TimestampedEntitySchema>;

/** Localized string — Turkish + English. */
export const LocalizedStringSchema = z.object({
  tr: z.string().min(1),
  en: z.string().min(1),
});
export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

/** Optional localized string (either side may be empty). */
export const OptionalLocalizedStringSchema = z.object({
  tr: z.string().default(''),
  en: z.string().default(''),
});
export type OptionalLocalizedString = z.infer<
  typeof OptionalLocalizedStringSchema
>;

/** Generic metadata bucket (free-form JSON). */
export const MetadataSchema = z.record(z.unknown()).default({});
export type Metadata = z.infer<typeof MetadataSchema>;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  cursor: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}

/** Generic factory for a paginated response schema wrapping an item schema. */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    hasMore: z.boolean(),
    nextCursor: z.string().optional(),
  });
