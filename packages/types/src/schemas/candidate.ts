import { z } from 'zod';
import {
  CandidateIdSchema,
  ApplicationIdSchema,
  TenantIdSchema,
  PositionIdSchema,
  AssessmentSessionIdSchema,
} from '../ids';
import { PipelineStageSchema } from '../enums/pipeline-stage';
import {
  IsoDateTimeSchema,
  TimestampsSchema,
  MetadataSchema,
} from './base';
import { TurkishPhoneSchema } from './turkish';

/** External candidate / applicant. */
export const CandidateSchema = z.object({
  id: CandidateIdSchema,
  tenantId: TenantIdSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: TurkishPhoneSchema.nullable(),
  linkedinUrl: z.string().url().nullable().default(null),
  resumeUrl: z.string().url().nullable().default(null),
  source: z.enum([
    'WEBSITE',
    'LINKEDIN',
    'REFERRAL',
    'AGENCY',
    'JOB_BOARD',
    'OTHER',
  ]),
  /** KVKK consent timestamp */
  kvkkConsentAt: IsoDateTimeSchema.nullable(),
  tags: z.array(z.string()).default([]),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Candidate = z.infer<typeof CandidateSchema>;

/** Application of a candidate to a position. */
export const ApplicationSchema = z.object({
  id: ApplicationIdSchema,
  tenantId: TenantIdSchema,
  candidateId: CandidateIdSchema,
  positionId: PositionIdSchema,
  stage: PipelineStageSchema,
  rejectionReason: z.string().nullable().default(null),
  assessmentSessionId: AssessmentSessionIdSchema.nullable(),
  overallRating: z.number().min(1).max(5).nullable(),
  offeredAt: IsoDateTimeSchema.nullable(),
  hiredAt: IsoDateTimeSchema.nullable(),
  rejectedAt: IsoDateTimeSchema.nullable(),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Application = z.infer<typeof ApplicationSchema>;

/** One stage transition record. */
export const PipelineStageTransitionSchema = z.object({
  id: z.string().uuid(),
  applicationId: ApplicationIdSchema,
  fromStage: PipelineStageSchema.nullable(),
  toStage: PipelineStageSchema,
  movedAt: IsoDateTimeSchema,
  movedByUserId: z.string().uuid(),
  notes: z.string().default(''),
});
export type PipelineStageTransition = z.infer<
  typeof PipelineStageTransitionSchema
>;
