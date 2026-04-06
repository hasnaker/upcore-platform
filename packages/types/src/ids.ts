/**
 * Branded UUID ID types for compile-time safety across entities.
 *
 * Each entity has its own branded type so that passing an EmployeeId
 * where a TenantId is expected produces a TypeScript error.
 *
 * Runtime validation is still Zod's `.uuid()` — brands only exist at
 * the type layer.
 */
import { z } from 'zod';

/** Generic UUID v4 string schema (unbranded). */
export const UuidSchema = z.string().uuid();
export type Uuid = z.infer<typeof UuidSchema>;

// ---------------------------------------------------------------------------
// Branded ID schemas
// ---------------------------------------------------------------------------

export const TenantIdSchema = z.string().uuid().brand<'TenantId'>();
export type TenantId = z.infer<typeof TenantIdSchema>;

export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export type UserId = z.infer<typeof UserIdSchema>;

export const EmployeeIdSchema = z.string().uuid().brand<'EmployeeId'>();
export type EmployeeId = z.infer<typeof EmployeeIdSchema>;

export const DepartmentIdSchema = z.string().uuid().brand<'DepartmentId'>();
export type DepartmentId = z.infer<typeof DepartmentIdSchema>;

export const PositionIdSchema = z.string().uuid().brand<'PositionId'>();
export type PositionId = z.infer<typeof PositionIdSchema>;

export const RoleIdSchema = z.string().uuid().brand<'RoleId'>();
export type RoleId = z.infer<typeof RoleIdSchema>;

export const PermissionIdSchema = z.string().uuid().brand<'PermissionId'>();
export type PermissionId = z.infer<typeof PermissionIdSchema>;

export const PlanIdSchema = z.string().uuid().brand<'PlanId'>();
export type PlanId = z.infer<typeof PlanIdSchema>;

export const SubscriptionIdSchema = z.string().uuid().brand<'SubscriptionId'>();
export type SubscriptionId = z.infer<typeof SubscriptionIdSchema>;

export const LeaveTypeIdSchema = z.string().uuid().brand<'LeaveTypeId'>();
export type LeaveTypeId = z.infer<typeof LeaveTypeIdSchema>;

export const LeaveRequestIdSchema = z.string().uuid().brand<'LeaveRequestId'>();
export type LeaveRequestId = z.infer<typeof LeaveRequestIdSchema>;

export const DocumentIdSchema = z.string().uuid().brand<'DocumentId'>();
export type DocumentId = z.infer<typeof DocumentIdSchema>;

export const DocumentVersionIdSchema = z
  .string()
  .uuid()
  .brand<'DocumentVersionId'>();
export type DocumentVersionId = z.infer<typeof DocumentVersionIdSchema>;

export const AssessmentIdSchema = z.string().uuid().brand<'AssessmentId'>();
export type AssessmentId = z.infer<typeof AssessmentIdSchema>;

export const AssessmentSessionIdSchema = z
  .string()
  .uuid()
  .brand<'AssessmentSessionId'>();
export type AssessmentSessionId = z.infer<typeof AssessmentSessionIdSchema>;

export const AssessmentResponseIdSchema = z
  .string()
  .uuid()
  .brand<'AssessmentResponseId'>();
export type AssessmentResponseId = z.infer<typeof AssessmentResponseIdSchema>;

export const InstrumentIdSchema = z.string().uuid().brand<'InstrumentId'>();
export type InstrumentId = z.infer<typeof InstrumentIdSchema>;

export const ItemIdSchema = z.string().uuid().brand<'ItemId'>();
export type ItemId = z.infer<typeof ItemIdSchema>;

export const SurveyIdSchema = z.string().uuid().brand<'SurveyId'>();
export type SurveyId = z.infer<typeof SurveyIdSchema>;

export const SurveyResponseIdSchema = z
  .string()
  .uuid()
  .brand<'SurveyResponseId'>();
export type SurveyResponseId = z.infer<typeof SurveyResponseIdSchema>;

export const SurveyCycleIdSchema = z.string().uuid().brand<'SurveyCycleId'>();
export type SurveyCycleId = z.infer<typeof SurveyCycleIdSchema>;

export const BurnoutSignalIdSchema = z
  .string()
  .uuid()
  .brand<'BurnoutSignalId'>();
export type BurnoutSignalId = z.infer<typeof BurnoutSignalIdSchema>;

export const InterventionIdSchema = z.string().uuid().brand<'InterventionId'>();
export type InterventionId = z.infer<typeof InterventionIdSchema>;

export const StrengthIdSchema = z.string().uuid().brand<'StrengthId'>();
export type StrengthId = z.infer<typeof StrengthIdSchema>;

export const StrengthProfileIdSchema = z
  .string()
  .uuid()
  .brand<'StrengthProfileId'>();
export type StrengthProfileId = z.infer<typeof StrengthProfileIdSchema>;

export const InternalPositionIdSchema = z
  .string()
  .uuid()
  .brand<'InternalPositionId'>();
export type InternalPositionId = z.infer<typeof InternalPositionIdSchema>;

export const CareerPathIdSchema = z.string().uuid().brand<'CareerPathId'>();
export type CareerPathId = z.infer<typeof CareerPathIdSchema>;

export const CandidateIdSchema = z.string().uuid().brand<'CandidateId'>();
export type CandidateId = z.infer<typeof CandidateIdSchema>;

export const ApplicationIdSchema = z.string().uuid().brand<'ApplicationId'>();
export type ApplicationId = z.infer<typeof ApplicationIdSchema>;

export const ActionItemIdSchema = z.string().uuid().brand<'ActionItemId'>();
export type ActionItemId = z.infer<typeof ActionItemIdSchema>;

export const NotificationIdSchema = z.string().uuid().brand<'NotificationId'>();
export type NotificationId = z.infer<typeof NotificationIdSchema>;

export const AuditEventIdSchema = z.string().uuid().brand<'AuditEventId'>();
export type AuditEventId = z.infer<typeof AuditEventIdSchema>;

// ---------------------------------------------------------------------------
// Convenience re-exports with shorter names for external consumers
// Usage: `TenantId.parse('...')` instead of `TenantIdSchema.parse('...')`
// ---------------------------------------------------------------------------

export const TenantId = TenantIdSchema;
export const UserId = UserIdSchema;
export const EmployeeId = EmployeeIdSchema;
export const DepartmentId = DepartmentIdSchema;
export const PositionId = PositionIdSchema;
export const RoleId = RoleIdSchema;
export const PermissionId = PermissionIdSchema;
export const PlanId = PlanIdSchema;
export const SubscriptionId = SubscriptionIdSchema;
export const LeaveTypeId = LeaveTypeIdSchema;
export const LeaveRequestId = LeaveRequestIdSchema;
export const DocumentId = DocumentIdSchema;
export const DocumentVersionId = DocumentVersionIdSchema;
export const AssessmentId = AssessmentIdSchema;
export const AssessmentSessionId = AssessmentSessionIdSchema;
export const AssessmentResponseId = AssessmentResponseIdSchema;
export const InstrumentId = InstrumentIdSchema;
export const ItemId = ItemIdSchema;
export const SurveyId = SurveyIdSchema;
export const SurveyResponseId = SurveyResponseIdSchema;
export const SurveyCycleId = SurveyCycleIdSchema;
export const BurnoutSignalId = BurnoutSignalIdSchema;
export const InterventionId = InterventionIdSchema;
export const StrengthId = StrengthIdSchema;
export const StrengthProfileId = StrengthProfileIdSchema;
export const InternalPositionId = InternalPositionIdSchema;
export const CareerPathId = CareerPathIdSchema;
export const CandidateId = CandidateIdSchema;
export const ApplicationId = ApplicationIdSchema;
export const ActionItemId = ActionItemIdSchema;
export const NotificationId = NotificationIdSchema;
export const AuditEventId = AuditEventIdSchema;
