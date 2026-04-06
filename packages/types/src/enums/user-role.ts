import { z } from 'zod';

/**
 * Role-based access control roles across the Upcore platform.
 *
 * Hierarchy (most → least privileged):
 *  - SUPER_ADMIN: Upcore staff, cross-tenant administration
 *  - TENANT_ADMIN: Tenant owner / admin
 *  - HR_DIRECTOR: Top-level HR leader
 *  - HR_MANAGER: HR team member
 *  - LINE_MANAGER: People manager of a team/department
 *  - EMPLOYEE: Regular employee
 *  - CANDIDATE: External applicant (recruiting only)
 */
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  HR_DIRECTOR: 'HR_DIRECTOR',
  HR_MANAGER: 'HR_MANAGER',
  LINE_MANAGER: 'LINE_MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  CANDIDATE: 'CANDIDATE',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserRoleSchema = z.enum([
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'HR_DIRECTOR',
  'HR_MANAGER',
  'LINE_MANAGER',
  'EMPLOYEE',
  'CANDIDATE',
]);

/** Numeric rank used for privilege comparisons (higher = more privileged). */
export const USER_ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  TENANT_ADMIN: 90,
  HR_DIRECTOR: 80,
  HR_MANAGER: 70,
  LINE_MANAGER: 50,
  EMPLOYEE: 10,
  CANDIDATE: 0,
};
