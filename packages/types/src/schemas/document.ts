import { z } from 'zod';
import {
  DocumentIdSchema,
  DocumentVersionIdSchema,
  EmployeeIdSchema,
  TenantIdSchema,
  UserIdSchema,
} from '../ids';
import { DocumentTypeSchema } from '../enums/document-type';
import {
  IsoDateTimeSchema,
  TimestampsSchema,
  MetadataSchema,
} from './base';

/** Document entity (metadata only — file stored in object store). */
export const DocumentSchema = z.object({
  id: DocumentIdSchema,
  tenantId: TenantIdSchema,
  employeeId: EmployeeIdSchema.nullable(),
  type: DocumentTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().default(''),
  currentVersionId: DocumentVersionIdSchema.nullable(),
  tags: z.array(z.string()).default([]),
  isConfidential: z.boolean().default(false),
  /** Signed-by user ids (for contracts, consents) */
  signedByUserIds: z.array(UserIdSchema).default([]),
  expiresAt: IsoDateTimeSchema.nullable(),
  metadata: MetadataSchema,
  ...TimestampsSchema.shape,
});
export type Document = z.infer<typeof DocumentSchema>;

export const CreateDocumentSchema = DocumentSchema.omit({
  id: true,
  currentVersionId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type CreateDocument = z.infer<typeof CreateDocumentSchema>;

/** Document version (actual file blob reference). */
export const DocumentVersionSchema = z.object({
  id: DocumentVersionIdSchema,
  documentId: DocumentIdSchema,
  version: z.number().int().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().nonnegative(),
  /** Object-store URL (signed, short-lived) */
  downloadUrl: z.string().url().nullable(),
  /** Raw storage key (used server-side) */
  storageKey: z.string().min(1),
  checksum: z.string().min(1),
  uploadedByUserId: UserIdSchema,
  uploadedAt: IsoDateTimeSchema,
  notes: z.string().default(''),
});
export type DocumentVersion = z.infer<typeof DocumentVersionSchema>;
