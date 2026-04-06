import { z } from 'zod';
import { CreateTenantSchema, TenantSchema, UpdateTenantSchema } from '../schemas/tenant';
import { PaginationQuerySchema, paginatedResponseSchema } from '../schemas/base';
import { PlanTierSchema } from '../enums/plan-tier';

export const CreateTenantRequestSchema = CreateTenantSchema;
export type CreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;

export const UpdateTenantRequestSchema = UpdateTenantSchema;
export type UpdateTenantRequest = z.infer<typeof UpdateTenantRequestSchema>;

export const TenantResponseSchema = TenantSchema;
export type TenantResponse = z.infer<typeof TenantResponseSchema>;

export const TenantListQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional(),
  planTier: PlanTierSchema.optional(),
  isActive: z.boolean().optional(),
});
export type TenantListQuery = z.infer<typeof TenantListQuerySchema>;

export const TenantListResponseSchema = paginatedResponseSchema(TenantSchema);
export type TenantListResponse = z.infer<typeof TenantListResponseSchema>;
