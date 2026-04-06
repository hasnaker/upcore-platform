import { z } from 'zod';

export const EmploymentStatus = {
  ACTIVE: 'ACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED',
  PRE_HIRE: 'PRE_HIRE',
} as const;
export type EmploymentStatus =
  (typeof EmploymentStatus)[keyof typeof EmploymentStatus];

export const EmploymentStatusSchema = z.enum([
  'ACTIVE',
  'ON_LEAVE',
  'SUSPENDED',
  'TERMINATED',
  'PRE_HIRE',
]);
