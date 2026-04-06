import { z } from 'zod';
import {
  AssessmentIdSchema,
  AssessmentSessionIdSchema,
  AssessmentResponseIdSchema,
  InstrumentIdSchema,
  ItemIdSchema,
  EmployeeIdSchema,
  TenantIdSchema,
} from '../ids';
import { AssessmentTypeSchema } from '../enums/assessment-type';
import {
  IsoDateTimeSchema,
  TimestampsSchema,
  MetadataSchema,
} from './base';

/** Assessment definition (published instance of an instrument). */
export const AssessmentSchema = z.object({
  id: AssessmentIdSchema,
  tenantId: TenantIdSchema,
  instrumentId: InstrumentIdSchema,
  type: AssessmentTypeSchema,
  name: z.string().min(1).max(200),
  language: z.enum(['tr', 'en']).default('tr'),
  /** Auto-computed when session completes */
  isAnonymous: z.boolean().default(false),
  isActive: z.boolean().default(true),
  availableFrom: IsoDateTimeSchema.nullable(),
  availableTo: IsoDateTimeSchema.nullable(),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Assessment = z.infer<typeof AssessmentSchema>;

/** Session status. */
export const AssessmentSessionStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'SUBMITTED',
  'SCORED',
  'EXPIRED',
  'ABANDONED',
]);
export type AssessmentSessionStatus = z.infer<
  typeof AssessmentSessionStatusSchema
>;

/** An employee's attempt at an assessment. */
export const AssessmentSessionSchema = z.object({
  id: AssessmentSessionIdSchema,
  tenantId: TenantIdSchema,
  assessmentId: AssessmentIdSchema,
  employeeId: EmployeeIdSchema,
  status: AssessmentSessionStatusSchema,
  startedAt: IsoDateTimeSchema.nullable(),
  submittedAt: IsoDateTimeSchema.nullable(),
  scoredAt: IsoDateTimeSchema.nullable(),
  expiresAt: IsoDateTimeSchema.nullable(),
  /** Dimension → raw score (after scoring job runs) */
  scores: z.record(z.number()).nullable(),
  /** Model/algorithm version used for scoring */
  scoringVersion: z.string().nullable(),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type AssessmentSession = z.infer<typeof AssessmentSessionSchema>;

/** Individual item response within a session. */
export const AssessmentResponseSchema = z.object({
  id: AssessmentResponseIdSchema,
  sessionId: AssessmentSessionIdSchema,
  itemId: ItemIdSchema,
  /** Raw numeric answer (e.g. 1-5 for Likert) */
  value: z.number(),
  /** Free-text if item allows comments */
  text: z.string().nullable().default(null),
  respondedAt: IsoDateTimeSchema,
});
export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;

/** Bulk submission payload. */
export const SubmitAssessmentSchema = z.object({
  sessionId: AssessmentSessionIdSchema,
  answers: z.array(
    z.object({
      itemId: ItemIdSchema,
      value: z.number(),
      text: z.string().nullable().optional(),
    }),
  ),
});
export type SubmitAssessment = z.infer<typeof SubmitAssessmentSchema>;

/** Scored result summary. */
export const AssessmentResultSchema = z.object({
  sessionId: AssessmentSessionIdSchema,
  assessmentId: AssessmentIdSchema,
  employeeId: EmployeeIdSchema,
  type: AssessmentTypeSchema,
  scores: z.record(z.number()),
  /** Textual interpretation of results (localized) */
  narrative: z
    .object({
      tr: z.string(),
      en: z.string(),
    })
    .nullable(),
  percentileRanks: z.record(z.number().min(0).max(100)).nullable(),
  scoredAt: IsoDateTimeSchema,
  scoringVersion: z.string(),
});
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;
