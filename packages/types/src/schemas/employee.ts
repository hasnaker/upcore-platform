import { z } from 'zod';
import {
  EmployeeIdSchema,
  TenantIdSchema,
  UserIdSchema,
  DepartmentIdSchema,
  PositionIdSchema,
} from '../ids';
import { EmploymentStatusSchema } from '../enums/employment-status';
import { ContractTypeSchema } from '../enums/contract-type';
import {
  IsoDateTimeSchema,
  IsoDateSchema,
  TimestampsSchema,
  MetadataSchema,
} from './base';
import { TcknSchema, TurkishPhoneSchema, IbanTrSchema } from './turkish';

/**
 * Employee (Çalışan) — core HRIS entity.
 *
 * Note: `email` and `phone` may differ from the auth User's email/phone.
 */
export const EmployeeSchema = z.object({
  id: EmployeeIdSchema,
  tenantId: TenantIdSchema,
  /** Associated auth user; null for employees without login access */
  userId: UserIdSchema.nullable(),
  /** Internal company-assigned sicil no (employee number) */
  sicilNo: z.string().min(1).max(50),
  /** T.C. Kimlik Numarası — nullable for non-citizens / pre-verified imports */
  tckn: TcknSchema.nullable(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  preferredName: z.string().max(100).nullable().default(null),
  email: z.string().email(),
  phone: TurkishPhoneSchema.nullable(),
  birthDate: IsoDateSchema.nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).nullable(),
  nationality: z.string().default('TR'),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']).nullable(),
  departmentId: DepartmentIdSchema.nullable(),
  positionId: PositionIdSchema.nullable(),
  managerId: EmployeeIdSchema.nullable(),
  employmentStatus: EmploymentStatusSchema,
  contractType: ContractTypeSchema,
  hireDate: IsoDateSchema,
  terminationDate: IsoDateSchema.nullable(),
  probationEndDate: IsoDateSchema.nullable(),
  avatarUrl: z.string().url().nullable().default(null),
  /** KVKK consent timestamp (personal data processing consent) */
  kvkkConsentAt: IsoDateTimeSchema.nullable(),
  /** IBAN for salary deposit */
  iban: IbanTrSchema.nullable(),
  address: z
    .object({
      line1: z.string(),
      line2: z.string().nullable().default(null),
      city: z.string(),
      district: z.string(),
      postcode: z.string(),
      country: z.string().default('TR'),
    })
    .nullable()
    .default(null),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Employee = z.infer<typeof EmployeeSchema>;

// ---------------------------------------------------------------------------
// Create / Update variants with business rules
// ---------------------------------------------------------------------------

export const CreateEmployeeSchema = EmployeeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).refine(
  (e) => !e.terminationDate || e.terminationDate >= e.hireDate,
  {
    message: 'İşten çıkış tarihi, işe giriş tarihinden önce olamaz',
    path: ['terminationDate'],
  },
);
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>;

export const UpdateEmployeeSchema = EmployeeSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).partial();
export type UpdateEmployee = z.infer<typeof UpdateEmployeeSchema>;

// ---------------------------------------------------------------------------
// List view variant (subset, no sensitive PII)
// ---------------------------------------------------------------------------

export const EmployeeListItemSchema = EmployeeSchema.pick({
  id: true,
  tenantId: true,
  sicilNo: true,
  firstName: true,
  lastName: true,
  email: true,
  departmentId: true,
  positionId: true,
  managerId: true,
  employmentStatus: true,
  contractType: true,
  hireDate: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
});
export type EmployeeListItem = z.infer<typeof EmployeeListItemSchema>;

// ---------------------------------------------------------------------------
// Employment history
// ---------------------------------------------------------------------------

export const EmploymentHistorySchema = z.object({
  id: z.string().uuid(),
  employeeId: EmployeeIdSchema,
  positionId: PositionIdSchema,
  departmentId: DepartmentIdSchema.nullable(),
  managerId: EmployeeIdSchema.nullable(),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema.nullable(),
  changeReason: z.enum([
    'HIRE',
    'PROMOTION',
    'TRANSFER',
    'DEMOTION',
    'REORG',
    'TERMINATION',
    'OTHER',
  ]),
  notes: z.string().default(''),
  ...TimestampsSchema.shape,
});
export type EmploymentHistory = z.infer<typeof EmploymentHistorySchema>;

// ---------------------------------------------------------------------------
// Emergency contact
// ---------------------------------------------------------------------------

export const EmergencyContactSchema = z.object({
  id: z.string().uuid(),
  employeeId: EmployeeIdSchema,
  name: z.string().min(1).max(200),
  relationship: z.string().min(1).max(50),
  phone: TurkishPhoneSchema,
  email: z.string().email().nullable().default(null),
  isPrimary: z.boolean().default(false),
  ...TimestampsSchema.shape,
});
export type EmergencyContact = z.infer<typeof EmergencyContactSchema>;
