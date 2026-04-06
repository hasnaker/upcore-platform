import { z } from 'zod';
import {
  InterventionSchema,
  CreateInterventionSchema,
  UpdateInterventionSchema,
} from '../schemas/intervention';
import {
  PaginationQuerySchema,
  paginatedResponseSchema,
} from '../schemas/base';
import { EmployeeIdSchema, UserIdSchema } from '../ids';
import {
  InterventionStatusSchema,
  InterventionCategorySchema,
} from '../enums/intervention-status';

export const CreateInterventionRequestSchema = CreateInterventionSchema;
export type CreateInterventionRequest = z.infer<
  typeof CreateInterventionRequestSchema
>;

export const UpdateInterventionRequestSchema = UpdateInterventionSchema;
export type UpdateInterventionRequest = z.infer<
  typeof UpdateInterventionRequestSchema
>;

export const InterventionListQuerySchema = PaginationQuerySchema.extend({
  employeeId: EmployeeIdSchema.optional(),
  assignedToUserId: UserIdSchema.optional(),
  status: InterventionStatusSchema.optional(),
  category: InterventionCategorySchema.optional(),
  priorityMin: z.coerce.number().int().min(1).max(5).optional(),
});
export type InterventionListQuery = z.infer<typeof InterventionListQuerySchema>;

export const InterventionListResponseSchema =
  paginatedResponseSchema(InterventionSchema);
export type InterventionListResponse = z.infer<
  typeof InterventionListResponseSchema
>;

export const InterventionResponseSchema = InterventionSchema;
export type InterventionResponse = z.infer<typeof InterventionResponseSchema>;

export const InterventionRecommendationRequestSchema = z.object({
  employeeId: EmployeeIdSchema,
  maxRecommendations: z.coerce.number().int().min(1).max(20).default(5),
});
export type InterventionRecommendationRequest = z.infer<
  typeof InterventionRecommendationRequestSchema
>;

export const InterventionRecommendationsResponseSchema = z.object({
  employeeId: EmployeeIdSchema,
  recommendations: z.array(
    z.object({
      category: InterventionCategorySchema,
      title: z.string(),
      description: z.string(),
      confidence: z.number().min(0).max(1),
      expectedImpact: z.number().min(0).max(1),
      evidence: z.array(z.string()).default([]),
    }),
  ),
  modelVersion: z.string(),
});
export type InterventionRecommendationsResponse = z.infer<
  typeof InterventionRecommendationsResponseSchema
>;
