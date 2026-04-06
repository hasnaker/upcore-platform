import { z } from 'zod';

/** Delivery channels for notifications. */
export const NotificationChannel = {
  EMAIL: 'EMAIL',
  IN_APP: 'IN_APP',
  SLACK: 'SLACK',
  SMS: 'SMS',
  PUSH: 'PUSH',
} as const;
export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationChannelSchema = z.enum([
  'EMAIL',
  'IN_APP',
  'SLACK',
  'SMS',
  'PUSH',
]);
