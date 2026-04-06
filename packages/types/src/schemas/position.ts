import { z } from 'zod';
import { PositionIdSchema, DepartmentIdSchema, TenantIdSchema } from '../ids';
import { TimestampsSchema, LocalizedStringSchema, MetadataSchema } from './base';

/** Job level ladder. */
export const JobLevelSchema = z.enum([
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
  'L6',
  'L7',
  'L8',
]);
export type JobLevel = z.infer<typeof JobLevelSchema>;

/** Position / title (unvan). */
export const PositionSchema = z.object({
  id: PositionIdSchema,
  tenantId: TenantIdSchema,
  title: z.string().min(1).max(200),
  code: z.string().min(1).max(30),
  departmentId: DepartmentIdSchema.nullable(),
  level: JobLevelSchema,
  jobFamily: z.string().min(1).max(100),
  description: z.string().default(''),
  salaryBand: z
    .object({
      min: z.number().nonnegative(),
      max: z.number().nonnegative(),
      currency: z.string().default('TRY'),
    })
    .nullable()
    .default(null),
  isActive: z.boolean().default(true),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Position = z.infer<typeof PositionSchema>;

export const CreatePositionSchema = PositionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type CreatePosition = z.infer<typeof CreatePositionSchema>;

export const UpdatePositionSchema = CreatePositionSchema.partial();
export type UpdatePosition = z.infer<typeof UpdatePositionSchema>;

// ---------------------------------------------------------------------------
// Job Demands-Resources (JD-R) profile per position
// ---------------------------------------------------------------------------

export const JDRProfileSchema = z.object({
  positionId: PositionIdSchema,
  /** Job demands (scale 1-5, higher = more demanding) */
  workload: z.number().min(1).max(5),
  emotionalDemand: z.number().min(1).max(5),
  cognitiveDemand: z.number().min(1).max(5),
  physicalDemand: z.number().min(1).max(5),
  /** Job resources (scale 1-5, higher = more available) */
  autonomy: z.number().min(1).max(5),
  socialSupport: z.number().min(1).max(5),
  feedback: z.number().min(1).max(5),
  growthOpportunities: z.number().min(1).max(5),
  ...TimestampsSchema.shape,
});
export type JDRProfile = z.infer<typeof JDRProfileSchema>;

// ---------------------------------------------------------------------------
// Responsibility (role responsibility)
// ---------------------------------------------------------------------------

export const ResponsibilitySchema = z.object({
  id: z.string().uuid(),
  positionId: PositionIdSchema,
  label: LocalizedStringSchema,
  order: z.number().int().min(0),
  isCritical: z.boolean().default(false),
});
export type Responsibility = z.infer<typeof ResponsibilitySchema>;
