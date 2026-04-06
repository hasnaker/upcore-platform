import { z } from 'zod';
import {
  ActionItemSchema,
  ActionPrioritySchema,
  ActionStatusSchema,
  ActionKindSchema,
} from '../schemas/action';
import {
  PaginationQuerySchema,
  paginatedResponseSchema,
} from '../schemas/base';
import { ActionItemIdSchema, UserIdSchema } from '../ids';

export const ListActionsQuerySchema = PaginationQuerySchema.extend({
  assignedToUserId: UserIdSchema.optional(),
  status: ActionStatusSchema.optional(),
  priority: ActionPrioritySchema.optional(),
  kind: ActionKindSchema.optional(),
});
export type ListActionsQuery = z.infer<typeof ListActionsQuerySchema>;

export const ListActionsResponseSchema = paginatedResponseSchema(ActionItemSchema);
export type ListActionsResponse = z.infer<typeof ListActionsResponseSchema>;

export const ApproveActionRequestSchema = z.object({
  actionId: ActionItemIdSchema,
  notes: z.string().max(2000).default(''),
});
export type ApproveActionRequest = z.infer<typeof ApproveActionRequestSchema>;

export const RejectActionRequestSchema = z.object({
  actionId: ActionItemIdSchema,
  reason: z.string().min(1).max(2000),
});
export type RejectActionRequest = z.infer<typeof RejectActionRequestSchema>;

export const ActionResponseSchema = ActionItemSchema;
export type ActionResponse = z.infer<typeof ActionResponseSchema>;
