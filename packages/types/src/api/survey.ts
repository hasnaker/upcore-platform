import { z } from 'zod';
import {
  SurveySchema,
  SurveyCycleSchema,
  SurveyResponseSchema,
  SubmitPulseResponseSchema,
  SurveyScheduleSchema,
} from '../schemas/survey';
import { paginatedResponseSchema, IsoDateSchema } from '../schemas/base';
import {
  SurveyIdSchema,
  SurveyCycleIdSchema,
  EmployeeIdSchema,
} from '../ids';

export const CreatePulseCycleRequestSchema = z.object({
  surveyId: SurveyIdSchema,
  weekOf: IsoDateSchema,
  schedule: SurveyScheduleSchema.optional(),
  targetEmployeeIds: z.array(EmployeeIdSchema).optional(),
});
export type CreatePulseCycleRequest = z.infer<
  typeof CreatePulseCycleRequestSchema
>;

export const SubmitPulseResponseRequestSchema = SubmitPulseResponseSchema;
export type SubmitPulseResponseRequest = z.infer<
  typeof SubmitPulseResponseRequestSchema
>;

export const PulseResultsQuerySchema = z.object({
  cycleId: SurveyCycleIdSchema,
  departmentId: z.string().uuid().optional(),
});
export type PulseResultsQuery = z.infer<typeof PulseResultsQuerySchema>;

export const PulseResultsResponseSchema = z.object({
  cycle: SurveyCycleSchema,
  survey: SurveySchema,
  totalResponses: z.number().int().nonnegative(),
  responseRate: z.number().min(0).max(1),
  averageScores: z.record(z.number()),
  sentimentAverage: z.number().min(-1).max(1).nullable(),
  byDepartment: z.array(
    z.object({
      departmentId: z.string().uuid(),
      departmentName: z.string(),
      responses: z.number().int().nonnegative(),
      averageScores: z.record(z.number()),
    }),
  ),
});
export type PulseResultsResponse = z.infer<typeof PulseResultsResponseSchema>;

export const SurveyResponseListSchema = paginatedResponseSchema(SurveyResponseSchema);
export type SurveyResponseList = z.infer<typeof SurveyResponseListSchema>;
