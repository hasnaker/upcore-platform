import { z } from 'zod';
import {
  InterventionIdSchema,
  EmployeeIdSchema,
  TenantIdSchema,
  UserIdSchema,
} from '../ids';
import {
  InterventionStatusSchema,
  InterventionCategorySchema,
} from '../enums/intervention-status';
import {
  IsoDateTimeSchema,
  IsoDateSchema,
  TimestampsSchema,
  LocalizedStringSchema,
  MetadataSchema,
} from './base';

/** Recommended or taken HR action for burnout/strength mitigation. */
export const InterventionSchema = z.object({
  id: InterventionIdSchema,
  tenantId: TenantIdSchema,
  /** Target employee */
  employeeId: EmployeeIdSchema,
  /** Who proposed this action */
  proposerType: z.enum(['AI', 'MANAGER', 'HR', 'SELF']),
  proposerUserId: UserIdSchema.nullable(),
  category: InterventionCategorySchema,
  title: z.string().min(1).max(200),
  description: LocalizedStringSchema,
  status: InterventionStatusSchema,
  priority: z.number().int().min(1).max(5),
  dueDate: IsoDateSchema.nullable(),
  assignedToUserId: UserIdSchema.nullable(),
  /** Reference to originating burnout signal, if any */
  triggeredBySignalId: z.string().uuid().nullable(),
  outcomeNotes: z.string().nullable().default(null),
  effectiveness: z.number().int().min(1).max(5).nullable(),
  completedAt: IsoDateTimeSchema.nullable(),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Intervention = z.infer<typeof InterventionSchema>;

export const CreateInterventionSchema = InterventionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  completedAt: true,
  effectiveness: true,
  outcomeNotes: true,
});
export type CreateIntervention = z.infer<typeof CreateInterventionSchema>;

export const UpdateInterventionSchema = InterventionSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).partial();
export type UpdateIntervention = z.infer<typeof UpdateInterventionSchema>;

/** Lightweight intervention assignment. */
export const InterventionAssignmentSchema = z.object({
  interventionId: InterventionIdSchema,
  assignedToUserId: UserIdSchema,
  assignedByUserId: UserIdSchema,
  assignedAt: IsoDateTimeSchema,
  dueDate: IsoDateSchema.nullable(),
});
export type InterventionAssignment = z.infer<
  typeof InterventionAssignmentSchema
>;

/** Post-completion outcome record. */
export const InterventionOutcomeSchema = z.object({
  interventionId: InterventionIdSchema,
  completedAt: IsoDateTimeSchema,
  effectiveness: z.number().int().min(1).max(5),
  notes: z.string(),
  followUpRequired: z.boolean().default(false),
  followUpDate: IsoDateSchema.nullable(),
});
export type InterventionOutcome = z.infer<typeof InterventionOutcomeSchema>;
