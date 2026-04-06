import { z } from 'zod';
import {
  BurnoutSignalSchema,
  BurnoutTrendSchema,
  BurnoutHeatmapCellSchema,
} from '../schemas/burnout';
import { paginatedResponseSchema, IsoDateSchema } from '../schemas/base';
import { EmployeeIdSchema, DepartmentIdSchema } from '../ids';
import { BurnoutLevelSchema } from '../enums/burnout-level';

export const BurnoutHeatmapQuerySchema = z.object({
  weekFrom: IsoDateSchema,
  weekTo: IsoDateSchema,
  departmentId: DepartmentIdSchema.optional(),
  minLevel: BurnoutLevelSchema.optional(),
});
export type BurnoutHeatmapQuery = z.infer<typeof BurnoutHeatmapQuerySchema>;

export const BurnoutHeatmapResponseSchema = z.object({
  cells: z.array(BurnoutHeatmapCellSchema),
  weeks: z.array(IsoDateSchema),
  departments: z.array(
    z.object({
      id: DepartmentIdSchema,
      name: z.string(),
    }),
  ),
});
export type BurnoutHeatmapResponse = z.infer<
  typeof BurnoutHeatmapResponseSchema
>;

export const BurnoutEmployeeDetailQuerySchema = z.object({
  employeeId: EmployeeIdSchema,
  weekFrom: IsoDateSchema.optional(),
  weekTo: IsoDateSchema.optional(),
});
export type BurnoutEmployeeDetailQuery = z.infer<
  typeof BurnoutEmployeeDetailQuerySchema
>;

export const BurnoutEmployeeDetailResponseSchema = z.object({
  current: BurnoutSignalSchema.nullable(),
  trend: BurnoutTrendSchema,
  history: z.array(BurnoutSignalSchema),
});
export type BurnoutEmployeeDetailResponse = z.infer<
  typeof BurnoutEmployeeDetailResponseSchema
>;

export const BurnoutSignalListQuerySchema = z.object({
  employeeId: EmployeeIdSchema.optional(),
  departmentId: DepartmentIdSchema.optional(),
  level: BurnoutLevelSchema.optional(),
  weekOf: IsoDateSchema.optional(),
});
export type BurnoutSignalListQuery = z.infer<
  typeof BurnoutSignalListQuerySchema
>;

export const BurnoutSignalListResponseSchema =
  paginatedResponseSchema(BurnoutSignalSchema);
export type BurnoutSignalListResponse = z.infer<
  typeof BurnoutSignalListResponseSchema
>;
