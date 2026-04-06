import { z } from 'zod';
import {
  SurveyIdSchema,
  SurveyResponseIdSchema,
  SurveyCycleIdSchema,
  EmployeeIdSchema,
  TenantIdSchema,
  DepartmentIdSchema,
} from '../ids';
import {
  IsoDateTimeSchema,
  IsoDateSchema,
  TimestampsSchema,
  LocalizedStringSchema,
  MetadataSchema,
} from './base';

/** A pulse survey question. */
export const PulseQuestionSchema = z.object({
  id: z.string().uuid(),
  text: LocalizedStringSchema,
  /** 1-10 sliding scale (default) */
  scale: z.enum(['SCALE_1_10', 'SCALE_1_5', 'YES_NO', 'OPEN_TEXT']).default('SCALE_1_10'),
  dimension: z.string().min(1).max(100),
  order: z.number().int().min(0),
  required: z.boolean().default(true),
});
export type PulseQuestion = z.infer<typeof PulseQuestionSchema>;

/** Survey definition (template). */
export const SurveySchema = z.object({
  id: SurveyIdSchema,
  tenantId: TenantIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  questions: z.array(PulseQuestionSchema).min(1).max(10),
  isAnonymous: z.boolean().default(true),
  isActive: z.boolean().default(true),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Survey = z.infer<typeof SurveySchema>;

/** Scheduled recurrence. */
export const SurveyScheduleSchema = z.object({
  cadence: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ADHOC']),
  dayOfWeek: z.number().int().min(0).max(6).nullable(),
  timezone: z.string().default('Europe/Istanbul'),
  openDurationHours: z.number().int().positive().default(48),
});
export type SurveySchedule = z.infer<typeof SurveyScheduleSchema>;

/** One cycle (run) of a survey. */
export const SurveyCycleSchema = z.object({
  id: SurveyCycleIdSchema,
  tenantId: TenantIdSchema,
  surveyId: SurveyIdSchema,
  weekOf: IsoDateSchema,
  openAt: IsoDateTimeSchema,
  closeAt: IsoDateTimeSchema,
  status: z.enum(['SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED']),
  targetEmployeeIds: z.array(EmployeeIdSchema).nullable(),
  responseCount: z.number().int().nonnegative().default(0),
  ...TimestampsSchema.shape,
});
export type SurveyCycle = z.infer<typeof SurveyCycleSchema>;

/** An employee's response to a cycle. */
export const SurveyResponseSchema = z.object({
  id: SurveyResponseIdSchema,
  tenantId: TenantIdSchema,
  surveyId: SurveyIdSchema,
  cycleId: SurveyCycleIdSchema,
  /** null when anonymous */
  employeeId: EmployeeIdSchema.nullable(),
  departmentId: DepartmentIdSchema.nullable(),
  /** questionId → answer */
  answers: z.record(z.union([z.number(), z.string()])),
  /** Overall sentiment (-1 to 1) — computed by NLP */
  sentiment: z.number().min(-1).max(1).nullable(),
  submittedAt: IsoDateTimeSchema,
  metadata: MetadataSchema,
});
export type SurveyResponse = z.infer<typeof SurveyResponseSchema>;

export const SubmitPulseResponseSchema = z.object({
  cycleId: SurveyCycleIdSchema,
  answers: z.record(z.union([z.number(), z.string()])),
});
export type SubmitPulseResponse = z.infer<typeof SubmitPulseResponseSchema>;
