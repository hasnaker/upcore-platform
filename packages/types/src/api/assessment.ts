import { z } from 'zod';
import {
  AssessmentSchema,
  AssessmentSessionSchema,
  AssessmentResultSchema,
  SubmitAssessmentSchema,
} from '../schemas/assessment';
import { paginatedResponseSchema } from '../schemas/base';
import {
  AssessmentIdSchema,
  EmployeeIdSchema,
  AssessmentSessionIdSchema,
} from '../ids';

export const StartAssessmentRequestSchema = z.object({
  assessmentId: AssessmentIdSchema,
  employeeId: EmployeeIdSchema,
});
export type StartAssessmentRequest = z.infer<
  typeof StartAssessmentRequestSchema
>;

export const StartAssessmentResponseSchema = z.object({
  session: AssessmentSessionSchema,
  assessment: AssessmentSchema,
});
export type StartAssessmentResponse = z.infer<
  typeof StartAssessmentResponseSchema
>;

export const SubmitAssessmentRequestSchema = SubmitAssessmentSchema;
export type SubmitAssessmentRequest = z.infer<
  typeof SubmitAssessmentRequestSchema
>;

export const AssessmentResultResponseSchema = AssessmentResultSchema;
export type AssessmentResultResponse = z.infer<
  typeof AssessmentResultResponseSchema
>;

export const AssessmentSessionListResponseSchema = paginatedResponseSchema(
  AssessmentSessionSchema,
);
export type AssessmentSessionListResponse = z.infer<
  typeof AssessmentSessionListResponseSchema
>;

export const GetAssessmentResultQuerySchema = z.object({
  sessionId: AssessmentSessionIdSchema,
});
export type GetAssessmentResultQuery = z.infer<
  typeof GetAssessmentResultQuerySchema
>;
