import { z } from 'zod';
import {
  BurnoutSignalIdSchema,
  EmployeeIdSchema,
  TenantIdSchema,
  DepartmentIdSchema,
} from '../ids';
import {
  BurnoutLevelSchema,
  burnoutLevelFromScore,
  type BurnoutLevel,
} from '../enums/burnout-level';
import {
  IsoDateTimeSchema,
  IsoDateSchema,
  TimestampsSchema,
  MetadataSchema,
} from './base';

/** MBI-aligned burnout dimensions (0-100 each). */
export const BurnoutDimensionsSchema = z.object({
  exhaustion: z.number().min(0).max(100),
  cynicism: z.number().min(0).max(100),
  efficacy: z.number().min(0).max(100),
});
export type BurnoutDimensions = z.infer<typeof BurnoutDimensionsSchema>;

/** A contributing driver/factor to the burnout score. */
export const BurnoutDriverSchema = z.object({
  factor: z.string().min(1).max(100),
  weight: z.number(),
  direction: z.enum(['up', 'down']),
  evidence: z.string().optional(),
});
export type BurnoutDriver = z.infer<typeof BurnoutDriverSchema>;

/** JD-R model score per employee. */
export const JDRScoreSchema = z.object({
  demands: z.number().min(0).max(100),
  resources: z.number().min(0).max(100),
  /** Gap = demands - resources; positive = imbalance toward risk */
  gap: z.number(),
});
export type JDRScore = z.infer<typeof JDRScoreSchema>;

/** Burnout signal per employee per week. */
export const BurnoutSignalSchema = z
  .object({
    id: BurnoutSignalIdSchema,
    tenantId: TenantIdSchema,
    employeeId: EmployeeIdSchema,
    departmentId: DepartmentIdSchema.nullable(),
    weekOf: IsoDateSchema,
    score: z.number().min(0).max(100),
    level: BurnoutLevelSchema,
    dimensions: BurnoutDimensionsSchema,
    jdr: JDRScoreSchema,
    drivers: z.array(BurnoutDriverSchema).default([]),
    modelVersion: z.string().min(1),
    computedAt: IsoDateTimeSchema,
    metadata: MetadataSchema,
    ...TimestampsSchema.shape,
  })
  .superRefine((sig, ctx) => {
    const expectedLevel: BurnoutLevel = burnoutLevelFromScore(sig.score);
    if (expectedLevel !== sig.level) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Level (${sig.level}) skor (${sig.score}) ile uyumsuz — beklenen: ${expectedLevel}`,
        path: ['level'],
      });
    }
  });
export type BurnoutSignal = z.infer<typeof BurnoutSignalSchema>;

/** Time-series of signals for trend charts. */
export const BurnoutTrendSchema = z.object({
  employeeId: EmployeeIdSchema,
  points: z.array(
    z.object({
      weekOf: IsoDateSchema,
      score: z.number().min(0).max(100),
      level: BurnoutLevelSchema,
    }),
  ),
  firstWeek: IsoDateSchema,
  lastWeek: IsoDateSchema,
});
export type BurnoutTrend = z.infer<typeof BurnoutTrendSchema>;

/** Heatmap cell: department × week. */
export const BurnoutHeatmapCellSchema = z.object({
  departmentId: DepartmentIdSchema,
  departmentName: z.string(),
  weekOf: IsoDateSchema,
  averageScore: z.number().min(0).max(100),
  level: BurnoutLevelSchema,
  employeeCount: z.number().int().nonnegative(),
  atRiskCount: z.number().int().nonnegative(),
});
export type BurnoutHeatmapCell = z.infer<typeof BurnoutHeatmapCellSchema>;
