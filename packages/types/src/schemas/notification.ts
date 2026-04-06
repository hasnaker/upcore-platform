import { z } from 'zod';
import { NotificationIdSchema, UserIdSchema, TenantIdSchema } from '../ids';
import { NotificationChannelSchema } from '../enums/notification-channel';
import {
  IsoDateTimeSchema,
  TimestampsSchema,
  LocalizedStringSchema,
  MetadataSchema,
} from './base';

/** Notification template (reusable). */
export const NotificationTemplateSchema = z.object({
  id: z.string().uuid(),
  tenantId: TenantIdSchema.nullable(), // null = system template
  key: z.string().min(1).max(100),
  title: LocalizedStringSchema,
  body: LocalizedStringSchema,
  channels: z.array(NotificationChannelSchema).min(1),
  isActive: z.boolean().default(true),
  ...TimestampsSchema.shape,
});
export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;

/** Single delivered notification. */
export const NotificationSchema = z.object({
  id: NotificationIdSchema,
  tenantId: TenantIdSchema,
  userId: UserIdSchema,
  type: z.string().min(1).max(100),
  title: LocalizedStringSchema,
  body: LocalizedStringSchema,
  link: z.string().nullable().default(null),
  channel: NotificationChannelSchema,
  readAt: IsoDateTimeSchema.nullable(),
  dismissedAt: IsoDateTimeSchema.nullable(),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Notification = z.infer<typeof NotificationSchema>;

/** Delivery record per channel. */
export const NotificationDeliverySchema = z.object({
  id: z.string().uuid(),
  notificationId: NotificationIdSchema,
  channel: NotificationChannelSchema,
  status: z.enum(['PENDING', 'SENT', 'FAILED', 'BOUNCED', 'DELIVERED']),
  providerRef: z.string().nullable(),
  attemptCount: z.number().int().nonnegative().default(0),
  lastAttemptAt: IsoDateTimeSchema.nullable(),
  failureReason: z.string().nullable(),
});
export type NotificationDelivery = z.infer<typeof NotificationDeliverySchema>;
