import { z } from 'zod';
import {
  InternalPositionIdSchema,
  CareerPathIdSchema,
  EmployeeIdSchema,
  TenantIdSchema,
  PositionIdSchema,
  DepartmentIdSchema,
} from '../ids';
import {
  IsoDateTimeSchema,
  TimestampsSchema,
  MetadataSchema,
} from './base';

/** Open internal position (V2 mobility feature). */
export const InternalPositionSchema = z.object({
  id: InternalPositionIdSchema,
  tenantId: TenantIdSchema,
  positionId: PositionIdSchema,
  departmentId: DepartmentIdSchema,
  title: z.string().min(1).max(200),
  description: z.string(),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  status: z.enum(['DRAFT', 'OPEN', 'FILLED', 'CANCELLED']),
  postedAt: IsoDateTimeSchema.nullable(),
  closesAt: IsoDateTimeSchema.nullable(),
  filledAt: IsoDateTimeSchema.nullable(),
  applicantCount: z.number().int().nonnegative().default(0),
  ...TimestampsSchema.shape,
});
export type InternalPosition = z.infer<typeof InternalPositionSchema>;

/** Suggested next position on a career path. */
export const CareerPathSuggestionSchema = z.object({
  positionId: PositionIdSchema,
  title: z.string(),
  fitScore: z.number().min(0).max(1),
  gaps: z.array(z.string()).default([]),
  strengthMatches: z.array(z.string()).default([]),
  estMonths: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
});
export type CareerPathSuggestion = z.infer<typeof CareerPathSuggestionSchema>;

/** Career path recommendation for an employee. */
export const CareerPathSchema = z.object({
  id: CareerPathIdSchema,
  tenantId: TenantIdSchema,
  employeeId: EmployeeIdSchema,
  currentPositionId: PositionIdSchema.nullable(),
  suggestedPositions: z.array(CareerPathSuggestionSchema),
  generatedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema.nullable(),
  modelVersion: z.string().min(1),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type CareerPath = z.infer<typeof CareerPathSchema>;

/** Employee expressed interest in an internal position. */
export const MobilityApplicationSchema = z.object({
  id: z.string().uuid(),
  employeeId: EmployeeIdSchema,
  internalPositionId: InternalPositionIdSchema,
  appliedAt: IsoDateTimeSchema,
  status: z.enum(['PENDING', 'REVIEWING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN']),
  coverMessage: z.string().max(2000).default(''),
  managerApprovalRequired: z.boolean().default(true),
  managerApprovedAt: IsoDateTimeSchema.nullable(),
  decisionAt: IsoDateTimeSchema.nullable(),
  decisionNotes: z.string().default(''),
});
export type MobilityApplication = z.infer<typeof MobilityApplicationSchema>;
