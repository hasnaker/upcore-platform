import { z } from 'zod';
import {
  StrengthIdSchema,
  StrengthProfileIdSchema,
  EmployeeIdSchema,
  TenantIdSchema,
  PositionIdSchema,
  AssessmentSessionIdSchema,
} from '../ids';
import {
  IsoDateTimeSchema,
  TimestampsSchema,
  LocalizedStringSchema,
} from './base';

/** Strength category (CliftonStrengths-inspired domains). */
export const StrengthCategorySchema = z.enum([
  'EXECUTING',
  'INFLUENCING',
  'RELATIONSHIP_BUILDING',
  'STRATEGIC_THINKING',
]);
export type StrengthCategory = z.infer<typeof StrengthCategorySchema>;

/** A single strength (theme). */
export const StrengthSchema = z.object({
  id: StrengthIdSchema,
  code: z.string().min(1).max(50),
  name: LocalizedStringSchema,
  description: LocalizedStringSchema,
  category: StrengthCategorySchema,
  isActive: z.boolean().default(true),
  ...TimestampsSchema.shape,
});
export type Strength = z.infer<typeof StrengthSchema>;

/** Ranked strength within a profile. */
export const StrengthRankSchema = z.object({
  strengthId: StrengthIdSchema,
  code: z.string(),
  name: LocalizedStringSchema,
  category: StrengthCategorySchema,
  rank: z.number().int().min(1).max(34),
  score: z.number().min(0).max(100),
});
export type StrengthRank = z.infer<typeof StrengthRankSchema>;

/** Per-employee strength profile. */
export const StrengthProfileSchema = z.object({
  id: StrengthProfileIdSchema,
  tenantId: TenantIdSchema,
  employeeId: EmployeeIdSchema,
  assessmentSessionId: AssessmentSessionIdSchema,
  top5: z.array(StrengthRankSchema).length(5),
  fullRanking: z.array(StrengthRankSchema),
  assessedAt: IsoDateTimeSchema,
  modelVersion: z.string().min(1),
  ...TimestampsSchema.shape,
});
export type StrengthProfile = z.infer<typeof StrengthProfileSchema>;

/** Fit between a strength profile and a role (V2 mobility feature). */
export const RoleMatchSchema = z.object({
  employeeId: EmployeeIdSchema,
  positionId: PositionIdSchema,
  fitScore: z.number().min(0).max(1),
  strengthAlignment: z.number().min(0).max(1),
  gapStrengths: z.array(z.string()),
  overlapStrengths: z.array(z.string()),
  computedAt: IsoDateTimeSchema,
  modelVersion: z.string().min(1),
});
export type RoleMatch = z.infer<typeof RoleMatchSchema>;
