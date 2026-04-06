import { z } from 'zod';
import {
  LeaveRequestIdSchema,
  LeaveTypeIdSchema,
  EmployeeIdSchema,
  TenantIdSchema,
} from '../ids';
import { LeaveTypeSchema, LeaveStatusSchema } from '../enums/leave-type';
import {
  IsoDateSchema,
  IsoDateTimeSchema,
  TimestampsSchema,
  MetadataSchema,
} from './base';

/** Leave policy (leave type definition scoped to tenant). */
export const LeavePolicySchema = z.object({
  id: LeaveTypeIdSchema,
  tenantId: TenantIdSchema,
  type: LeaveTypeSchema,
  name: z.string().min(1).max(100),
  description: z.string().default(''),
  isPaid: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  requiresDocument: z.boolean().default(false),
  /** Max days per year (null = unlimited) */
  maxDaysPerYear: z.number().int().min(0).nullable(),
  /** Carry-over allowed from prior year */
  carryOverDays: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  ...TimestampsSchema.shape,
});
export type LeavePolicy = z.infer<typeof LeavePolicySchema>;

/** Leave request (izin talebi). */
export const LeaveRequestSchema = z
  .object({
    id: LeaveRequestIdSchema,
    tenantId: TenantIdSchema,
    employeeId: EmployeeIdSchema,
    leaveTypeId: LeaveTypeIdSchema,
    type: LeaveTypeSchema,
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    /** Business days (derived; excludes weekends) */
    days: z.number().positive(),
    status: LeaveStatusSchema,
    reason: z.string().max(1000).default(''),
    approverId: EmployeeIdSchema.nullable(),
    approvedAt: IsoDateTimeSchema.nullable(),
    rejectionReason: z.string().nullable().default(null),
    documentUrl: z.string().url().nullable().default(null),
    metadata: MetadataSchema,
    ...TimestampsSchema.shape,
  })
  .refine((l) => l.endDate >= l.startDate, {
    message: 'Bitiş tarihi, başlangıç tarihinden önce olamaz',
    path: ['endDate'],
  });
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;

export const CreateLeaveRequestSchema = z
  .object({
    leaveTypeId: LeaveTypeIdSchema,
    type: LeaveTypeSchema,
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    reason: z.string().max(1000).default(''),
    documentUrl: z.string().url().nullable().default(null),
  })
  .refine((l) => l.endDate >= l.startDate, {
    message: 'Bitiş tarihi, başlangıç tarihinden önce olamaz',
    path: ['endDate'],
  });
export type CreateLeaveRequest = z.infer<typeof CreateLeaveRequestSchema>;

/** Leave balance (izin bakiye) per employee per policy. */
export const LeaveBalanceSchema = z.object({
  employeeId: EmployeeIdSchema,
  leaveTypeId: LeaveTypeIdSchema,
  type: LeaveTypeSchema,
  year: z.number().int().min(2000).max(2100),
  entitled: z.number().nonnegative(),
  used: z.number().nonnegative(),
  pending: z.number().nonnegative(),
  carriedOver: z.number().nonnegative(),
  remaining: z.number(),
  updatedAt: IsoDateTimeSchema,
});
export type LeaveBalance = z.infer<typeof LeaveBalanceSchema>;
