import { z } from 'zod';
import { InstrumentIdSchema, ItemIdSchema, TenantIdSchema } from '../ids';
import { AssessmentTypeSchema } from '../enums/assessment-type';
import {
  TimestampsSchema,
  LocalizedStringSchema,
  MetadataSchema,
} from './base';

/** Response scale for an assessment item. */
export const ResponseScaleSchema = z.enum([
  'LIKERT_5',
  'LIKERT_7',
  'BINARY',
  'FREQUENCY_7',
  'SLIDER_0_100',
]);
export type ResponseScale = z.infer<typeof ResponseScaleSchema>;

/** Single item (question) in an instrument. */
export const ItemSchema = z.object({
  id: ItemIdSchema,
  instrumentId: InstrumentIdSchema,
  code: z.string().min(1).max(50),
  text: LocalizedStringSchema,
  scale: ResponseScaleSchema,
  reverseScored: z.boolean().default(false),
  /** Dimension this item loads on (e.g. "exhaustion", "efficacy") */
  dimension: z.string().min(1).max(100),
  order: z.number().int().min(0),
  isActive: z.boolean().default(true),
});
export type Item = z.infer<typeof ItemSchema>;

/** Scoring configuration: how to compute dimension scores from item answers. */
export const ScoringConfigSchema = z.object({
  method: z.enum(['MEAN', 'SUM', 'WEIGHTED_SUM', 'ZSCORE', 'PERCENTILE']),
  /** Dimension → item ids mapping */
  dimensions: z.record(z.array(ItemIdSchema)),
  weights: z.record(z.number()).optional(),
  /** Norm group for z-scoring */
  normGroup: z.string().optional(),
  /** Percentile cutoffs for labeling results */
  cutoffs: z
    .object({
      low: z.number(),
      high: z.number(),
    })
    .optional(),
});
export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;

/** Instrument = versioned psychometric questionnaire. */
export const InstrumentSchema = z.object({
  id: InstrumentIdSchema,
  tenantId: TenantIdSchema.nullable(), // null = built-in global instrument
  type: AssessmentTypeSchema,
  name: LocalizedStringSchema,
  description: LocalizedStringSchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/, {
    message: 'Version must be semver (e.g. 1.0.0)',
  }),
  language: z.enum(['tr', 'en']),
  itemCount: z.number().int().positive(),
  estimatedMinutes: z.number().int().positive(),
  scoring: ScoringConfigSchema,
  isActive: z.boolean().default(true),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Instrument = z.infer<typeof InstrumentSchema>;
