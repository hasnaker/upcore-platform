import { z } from 'zod';
import {
  ActionItemIdSchema,
  TenantIdSchema,
  UserIdSchema,
  EmployeeIdSchema,
  InterventionIdSchema,
} from '../ids';
import {
  IsoDateTimeSchema,
  IsoDateSchema,
  TimestampsSchema,
  LocalizedStringSchema,
  MetadataSchema,
} from './base';

export const ActionPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export type ActionPriority = z.infer<typeof ActionPrioritySchema>;

export const ActionStatusSchema = z.enum([
  'OPEN',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
  'CANCELLED',
]);
export type ActionStatus = z.infer<typeof ActionStatusSchema>;

export const ActionKindSchema = z.enum([
  'APPROVE_LEAVE',
  'REVIEW_BURNOUT',
  'ASSIGN_INTERVENTION',
  'HIRE_DECISION',
  'TERMINATE',
  'PROMOTE',
  'TRANSFER',
  'SURVEY_FOLLOWUP',
  'CUSTOM',
]);
export type ActionKind = z.infer<typeof ActionKindSchema>;

/** Action item — decision/approval required in a workflow. */
export const ActionItemSchema = z.object({
  id: ActionItemIdSchema,
  tenantId: TenantIdSchema,
  kind: ActionKindSchema,
  title: LocalizedStringSchema,
  summary: LocalizedStringSchema,
  priority: ActionPrioritySchema,
  status: ActionStatusSchema,
  /** User assigned to take the action */
  assignedToUserId: UserIdSchema,
  createdByUserId: UserIdSchema.nullable(),
  /** Subject employee (if relevant) */
  subjectEmployeeId: EmployeeIdSchema.nullable(),
  /** Linked intervention (if spawned from one) */
  interventionId: InterventionIdSchema.nullable(),
  /** Free-form reference to source object */
  sourceRef: z
    .object({
      type: z.string(),
      id: z.string(),
    })
    .nullable(),
  dueDate: IsoDateSchema.nullable(),
  approvedAt: IsoDateTimeSchema.nullable(),
  rejectedAt: IsoDateTimeSchema.nullable(),
  executedAt: IsoDateTimeSchema.nullable(),
  decisionNotes: z.string().default(''),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

/** Decision flow (approval chain definition). */
export const DecisionFlowSchema = z.object({
  id: z.string().uuid(),
  tenantId: TenantIdSchema,
  name: z.string().min(1).max(200),
  kind: ActionKindSchema,
  /** Ordered list of approver roles */
  approverSteps: z.array(
    z.object({
      order: z.number().int().min(0),
      roleKey: z.string(),
      requireAll: z.boolean().default(false),
      autoEscalateAfterHours: z.number().int().positive().nullable(),
    }),
  ),
  isActive: z.boolean().default(true),
  ...TimestampsSchema.shape,
});
export type DecisionFlow = z.infer<typeof DecisionFlowSchema>;
