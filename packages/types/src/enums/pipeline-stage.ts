import { z } from 'zod';

/** Recruiting pipeline stages. */
export const PipelineStage = {
  APPLIED: 'APPLIED',
  SCREENED: 'SCREENED',
  ASSESSED: 'ASSESSED',
  INTERVIEWED: 'INTERVIEWED',
  OFFERED: 'OFFERED',
  HIRED: 'HIRED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type PipelineStage = (typeof PipelineStage)[keyof typeof PipelineStage];

export const PipelineStageSchema = z.enum([
  'APPLIED',
  'SCREENED',
  'ASSESSED',
  'INTERVIEWED',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
]);

export const PIPELINE_STAGE_ORDER: Record<PipelineStage, number> = {
  APPLIED: 0,
  SCREENED: 1,
  ASSESSED: 2,
  INTERVIEWED: 3,
  OFFERED: 4,
  HIRED: 5,
  REJECTED: 99,
  WITHDRAWN: 98,
};
