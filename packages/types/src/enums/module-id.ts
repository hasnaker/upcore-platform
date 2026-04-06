import { z } from 'zod';

/** Platform modules a tenant can enable. */
export const ModuleId = {
  CORE_HRIS: 'CORE_HRIS',
  BURNOUT: 'BURNOUT',
  ASSESSMENT: 'ASSESSMENT',
  STRENGTHS: 'STRENGTHS',
  MOBILITY: 'MOBILITY',
  RECRUITING: 'RECRUITING',
  SURVEYS: 'SURVEYS',
} as const;
export type ModuleId = (typeof ModuleId)[keyof typeof ModuleId];

export const ModuleIdSchema = z.enum([
  'CORE_HRIS',
  'BURNOUT',
  'ASSESSMENT',
  'STRENGTHS',
  'MOBILITY',
  'RECRUITING',
  'SURVEYS',
]);
