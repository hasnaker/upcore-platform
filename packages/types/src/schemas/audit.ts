import { z } from 'zod';
import { AuditEventIdSchema, TenantIdSchema, UserIdSchema } from '../ids';
import { IsoDateTimeSchema, MetadataSchema } from './base';

/** KVKK-compliant audit log entry. */
export const AuditEventSchema = z.object({
  id: AuditEventIdSchema,
  tenantId: TenantIdSchema.nullable(),
  actorUserId: UserIdSchema.nullable(),
  actorRole: z.string().nullable(),
  action: z.string().min(1).max(100),
  resourceType: z.string().min(1).max(100),
  resourceId: z.string().nullable(),
  /** Diff of changed fields */
  changes: z.record(z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  traceId: z.string().nullable(),
  occurredAt: IsoDateTimeSchema,
  metadata: MetadataSchema,
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

/** Query filter for audit log listings. */
export const AuditLogQuerySchema = z.object({
  actorUserId: UserIdSchema.optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  action: z.string().optional(),
  fromDate: IsoDateTimeSchema.optional(),
  toDate: IsoDateTimeSchema.optional(),
});
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
