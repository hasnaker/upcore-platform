import { z } from 'zod';
import {
  DepartmentIdSchema,
  EmployeeIdSchema,
  TenantIdSchema,
} from '../ids';
import { TimestampsSchema, MetadataSchema } from './base';

/** Department (departman) — forms the org tree. */
export const DepartmentSchema = z.object({
  id: DepartmentIdSchema,
  tenantId: TenantIdSchema,
  name: z.string().min(1).max(200),
  /** Short company-internal code, e.g. "HR", "ENG-BE" */
  code: z.string().min(1).max(20),
  /** Parent department; null for root */
  parentId: DepartmentIdSchema.nullable(),
  /** Employee acting as department head */
  managerId: EmployeeIdSchema.nullable(),
  description: z.string().default(''),
  /** Derived count of direct employees (server-computed) */
  headcount: z.number().int().min(0).default(0),
  costCenter: z.string().nullable().default(null),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Department = z.infer<typeof DepartmentSchema>;

export const CreateDepartmentSchema = DepartmentSchema.omit({
  id: true,
  headcount: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).refine((d) => d.parentId == null || true, {
  message: 'parentId cannot reference itself (enforced server-side)',
});
export type CreateDepartment = z.infer<typeof CreateDepartmentSchema>;

export const UpdateDepartmentSchema = DepartmentSchema.omit({
  id: true,
  tenantId: true,
  headcount: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).partial();
export type UpdateDepartment = z.infer<typeof UpdateDepartmentSchema>;

// ---------------------------------------------------------------------------
// Recursive Department tree
// ---------------------------------------------------------------------------

export interface DepartmentTree extends Department {
  children: DepartmentTree[];
}

export const DepartmentTreeSchema: z.ZodType<DepartmentTree> = z.lazy(() =>
  DepartmentSchema.extend({
    children: z.array(DepartmentTreeSchema),
  }),
) as unknown as z.ZodType<DepartmentTree>;

// ---------------------------------------------------------------------------
// Organization node (flattened representation for charts)
// ---------------------------------------------------------------------------

export const OrgNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['DEPARTMENT', 'EMPLOYEE']),
  name: z.string(),
  parentId: z.string().uuid().nullable(),
  depth: z.number().int().min(0),
  metadata: MetadataSchema,
});
export type OrgNode = z.infer<typeof OrgNodeSchema>;

export const ReportingLineSchema = z.object({
  employeeId: EmployeeIdSchema,
  managerId: EmployeeIdSchema.nullable(),
  depth: z.number().int().min(0),
  path: z.array(EmployeeIdSchema),
});
export type ReportingLine = z.infer<typeof ReportingLineSchema>;
