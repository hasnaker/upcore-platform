import { z } from 'zod';

/** Document categories in the HRIS document vault. */
export const DocumentType = {
  CONTRACT: 'CONTRACT',
  ID: 'ID',
  PAYROLL: 'PAYROLL',
  PERFORMANCE: 'PERFORMANCE',
  TRAINING: 'TRAINING',
  OFFER_LETTER: 'OFFER_LETTER',
  TERMINATION: 'TERMINATION',
  HEALTH: 'HEALTH',
  KVKK_CONSENT: 'KVKK_CONSENT',
  OTHER: 'OTHER',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DocumentTypeSchema = z.enum([
  'CONTRACT',
  'ID',
  'PAYROLL',
  'PERFORMANCE',
  'TRAINING',
  'OFFER_LETTER',
  'TERMINATION',
  'HEALTH',
  'KVKK_CONSENT',
  'OTHER',
]);
