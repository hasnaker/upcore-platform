import { z } from 'zod';
import {
  TenantIdSchema,
  UserIdSchema,
  EmployeeIdSchema,
  RoleIdSchema,
  PermissionIdSchema,
} from '../ids';
import { UserRoleSchema } from '../enums/user-role';
import {
  IsoDateTimeSchema,
  TimestampsSchema,
  MetadataSchema,
} from './base';

/**
 * Auth user — distinct from Employee profile.
 * A user may or may not have an employee record (e.g. super admins, candidates).
 */
export const UserSchema = z.object({
  id: UserIdSchema,
  tenantId: TenantIdSchema.nullable(),
  email: z.string().email(),
  role: UserRoleSchema,
  employeeId: EmployeeIdSchema.nullable(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  emailVerified: z.boolean().default(false),
  emailVerifiedAt: IsoDateTimeSchema.nullable(),
  lastLoginAt: IsoDateTimeSchema.nullable(),
  mfaEnabled: z.boolean().default(false),
  mfaMethod: z.enum(['TOTP', 'SMS', 'EMAIL']).nullable().default(null),
  isActive: z.boolean().default(true),
  locale: z.enum(['tr-TR', 'en-US']).default('tr-TR'),
  avatarUrl: z.string().url().nullable().default(null),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  lastLoginAt: true,
  emailVerified: true,
  emailVerifiedAt: true,
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = CreateUserSchema.partial();
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

// ---------------------------------------------------------------------------
// Role & Permission
// ---------------------------------------------------------------------------

export const PermissionSchema = z.object({
  id: PermissionIdSchema,
  /** e.g. "employees:read", "burnout:write" */
  key: z.string().regex(/^[a-z_]+:[a-z_]+$/, {
    message: 'Permission key formatı: "resource:action"',
  }),
  description: z.string(),
  ...TimestampsSchema.shape,
});
export type Permission = z.infer<typeof PermissionSchema>;

export const RoleSchema = z.object({
  id: RoleIdSchema,
  tenantId: TenantIdSchema.nullable(),
  name: z.string().min(1).max(100),
  description: z.string(),
  permissions: z.array(PermissionIdSchema).default([]),
  isSystem: z.boolean().default(false),
  ...TimestampsSchema.shape,
});
export type Role = z.infer<typeof RoleSchema>;
