import { z } from 'zod';
import { TenantIdSchema, PlanIdSchema, SubscriptionIdSchema } from '../ids';
import { PlanTierSchema } from '../enums/plan-tier';
import { ModuleIdSchema } from '../enums/module-id';
import {
  IsoDateTimeSchema,
  IsoDateSchema,
  TimestampsSchema,
  MetadataSchema,
} from './base';
import { VknSchema } from './turkish';

/** Company / tenant — top of the multi-tenant hierarchy. */
export const TenantSchema = z.object({
  id: TenantIdSchema,
  name: z.string().min(2).max(200),
  /** kebab-case URL identifier, e.g. "acme-tr" */
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug küçük harf, rakam ve tire (-) içerebilir',
    }),
  planTier: PlanTierSchema,
  seatCount: z.number().int().min(1),
  locale: z.enum(['tr-TR', 'en-US']).default('tr-TR'),
  timezone: z.string().default('Europe/Istanbul'),
  /** Vergi numarası (VKN) — 10 hane */
  vergiNo: VknSchema.optional(),
  /** List of enabled modules */
  enabledModules: z.array(ModuleIdSchema).default([]),
  logoUrl: z.string().url().nullable().default(null),
  primaryDomain: z.string().nullable().default(null),
  contactEmail: z.string().email().nullable().default(null),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Tenant = z.infer<typeof TenantSchema>;

export const CreateTenantSchema = TenantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type CreateTenant = z.infer<typeof CreateTenantSchema>;

export const UpdateTenantSchema = CreateTenantSchema.partial();
export type UpdateTenant = z.infer<typeof UpdateTenantSchema>;

// ---------------------------------------------------------------------------
// Plan (pricing tier definition)
// ---------------------------------------------------------------------------

export const PlanSchema = z.object({
  id: PlanIdSchema,
  tier: PlanTierSchema,
  name: z.string().min(1),
  description: z.string(),
  priceMonthlyTry: z.number().nonnegative(),
  priceYearlyTry: z.number().nonnegative(),
  maxSeats: z.number().int().positive(),
  includedModules: z.array(ModuleIdSchema),
  isActive: z.boolean().default(true),
  ...TimestampsSchema.shape,
});
export type Plan = z.infer<typeof PlanSchema>;

// ---------------------------------------------------------------------------
// Subscription (tenant ↔ plan binding)
// ---------------------------------------------------------------------------

export const SubscriptionStatusSchema = z.enum([
  'TRIAL',
  'ACTIVE',
  'PAST_DUE',
  'CANCELLED',
  'EXPIRED',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z.object({
  id: SubscriptionIdSchema,
  tenantId: TenantIdSchema,
  planId: PlanIdSchema,
  status: SubscriptionStatusSchema,
  startedAt: IsoDateTimeSchema,
  trialEndsAt: IsoDateTimeSchema.nullable(),
  currentPeriodStart: IsoDateSchema,
  currentPeriodEnd: IsoDateSchema,
  cancelAtPeriodEnd: z.boolean().default(false),
  cancelledAt: IsoDateTimeSchema.nullable(),
  seats: z.number().int().positive(),
  ...TimestampsSchema.shape,
});
export type Subscription = z.infer<typeof SubscriptionSchema>;
