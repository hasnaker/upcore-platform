import { z } from 'zod';

export const InterventionStatus = {
  PROPOSED: 'PROPOSED',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DISMISSED: 'DISMISSED',
} as const;
export type InterventionStatus =
  (typeof InterventionStatus)[keyof typeof InterventionStatus];

export const InterventionStatusSchema = z.enum([
  'PROPOSED',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'DISMISSED',
]);

export const InterventionCategory = {
  WORKLOAD: 'WORKLOAD',
  AUTONOMY: 'AUTONOMY',
  RELATIONSHIPS: 'RELATIONSHIPS',
  RECOGNITION: 'RECOGNITION',
  GROWTH: 'GROWTH',
  WELLBEING: 'WELLBEING',
  COACHING: 'COACHING',
  ROLE_DESIGN: 'ROLE_DESIGN',
} as const;
export type InterventionCategory =
  (typeof InterventionCategory)[keyof typeof InterventionCategory];
export const InterventionCategorySchema = z.enum([
  'WORKLOAD',
  'AUTONOMY',
  'RELATIONSHIPS',
  'RECOGNITION',
  'GROWTH',
  'WELLBEING',
  'COACHING',
  'ROLE_DESIGN',
]);
