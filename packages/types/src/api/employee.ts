import { z } from 'zod';
import {
  EmployeeSchema,
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  EmployeeListItemSchema,
} from '../schemas/employee';
import { PaginationQuerySchema, paginatedResponseSchema } from '../schemas/base';
import { EmploymentStatusSchema } from '../enums/employment-status';
import { ContractTypeSchema } from '../enums/contract-type';
import { DepartmentIdSchema, PositionIdSchema } from '../ids';

export const EmployeeListQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional(),
  departmentId: DepartmentIdSchema.optional(),
  positionId: PositionIdSchema.optional(),
  employmentStatus: EmploymentStatusSchema.optional(),
  contractType: ContractTypeSchema.optional(),
  managerId: z.string().uuid().optional(),
  hireDateFrom: z.string().optional(),
  hireDateTo: z.string().optional(),
});
export type EmployeeListQuery = z.infer<typeof EmployeeListQuerySchema>;

export const EmployeeListResponseSchema = paginatedResponseSchema(
  EmployeeListItemSchema,
);
export type EmployeeListResponse = z.infer<typeof EmployeeListResponseSchema>;

export const CreateEmployeeRequestSchema = CreateEmployeeSchema;
export type CreateEmployeeRequest = z.infer<typeof CreateEmployeeRequestSchema>;

export const UpdateEmployeeRequestSchema = UpdateEmployeeSchema;
export type UpdateEmployeeRequest = z.infer<typeof UpdateEmployeeRequestSchema>;

export const EmployeeResponseSchema = EmployeeSchema;
export type EmployeeResponse = z.infer<typeof EmployeeResponseSchema>;

/** Bulk CSV import. */
export const BulkImportCsvRequestSchema = z.object({
  /** Base64-encoded CSV file */
  fileBase64: z.string().min(1),
  fileName: z.string().min(1),
  /** Dry run: validate only without writing */
  dryRun: z.boolean().default(false),
  /** Column mapping overrides */
  columnMapping: z.record(z.string()).optional(),
});
export type BulkImportCsvRequest = z.infer<typeof BulkImportCsvRequestSchema>;

export const BulkImportResponseSchema = z.object({
  totalRows: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  errors: z.array(
    z.object({
      row: z.number().int().nonnegative(),
      field: z.string().nullable(),
      message: z.string(),
    }),
  ),
});
export type BulkImportResponse = z.infer<typeof BulkImportResponseSchema>;
