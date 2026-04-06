import { z } from 'zod';

/** Psychological assessment instrument categories. */
export const AssessmentType = {
  PSYCAP: 'PSYCAP',
  JDR: 'JDR',
  STRENGTHS: 'STRENGTHS',
  BIG_FIVE: 'BIG_FIVE',
  ENGAGEMENT: 'ENGAGEMENT',
  BURNOUT_MBI: 'BURNOUT_MBI',
  CUSTOM: 'CUSTOM',
} as const;
export type AssessmentType =
  (typeof AssessmentType)[keyof typeof AssessmentType];

export const AssessmentTypeSchema = z.enum([
  'PSYCAP',
  'JDR',
  'STRENGTHS',
  'BIG_FIVE',
  'ENGAGEMENT',
  'BURNOUT_MBI',
  'CUSTOM',
]);
