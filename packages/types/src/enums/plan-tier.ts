import { z } from 'zod';

/**
 * Tenant subscription tiers.
 *
 * FREE:       trial / demo
 * STARTER:    small SMB (< 50 employees)
 * GROWTH:     scale-up (50 – 250)
 * PLATFORM:   enterprise lite (250 – 1,000)
 * ENTERPRISE: full enterprise (1,000+)
 */
export const PlanTier = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
  PLATFORM: 'PLATFORM',
  ENTERPRISE: 'ENTERPRISE',
} as const;
export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

export const PlanTierSchema = z.enum([
  'FREE',
  'STARTER',
  'GROWTH',
  'PLATFORM',
  'ENTERPRISE',
]);

export const PLAN_TIER_MAX_SEATS: Record<PlanTier, number> = {
  FREE: 10,
  STARTER: 50,
  GROWTH: 250,
  PLATFORM: 1000,
  ENTERPRISE: Number.MAX_SAFE_INTEGER,
};
