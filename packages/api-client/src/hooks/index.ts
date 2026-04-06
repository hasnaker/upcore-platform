/**
 * Barrel export for all React Query hooks.
 */

// Auth
export { useCurrentUser, useCurrentTenant, useLogout } from './auth';
export { useLogin } from './auth';
export { useSignup } from './auth';
export { useForgotPassword, useResetPassword } from './auth';

// Employees
export { useEmployees, useEmployeesInfinite } from './employees';
export { useEmployee } from './employees';
export {
  useCreateEmployee,
  useUpdateEmployee,
  useTerminateEmployee,
  useBulkImportEmployees,
  useDeleteEmployee,
} from './employees';

// Departments
export {
  useDepartments,
  useDepartmentTree,
  useDepartment,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useMoveDepartment,
} from './departments';

// Positions
export {
  usePositions,
  usePosition,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
} from './positions';

// Leaves
export { useLeaveRequests, useLeaveBalance, useMyLeaves } from './leaves';
export {
  useCreateLeaveRequest,
  useApproveLeave,
  useRejectLeave,
  useCancelLeave,
} from './leaves';

// Documents
export { useDocuments, useUploadDocument, useDocumentDownloadUrl } from './documents';

// Assessments
export {
  useAssessments,
  useAssessment,
  useMyAssessments,
  useStartAssessment,
  useSaveAnswers,
  useSubmitAssessment,
  useAssessmentResults,
} from './assessments';

// Burnout
export {
  useBurnoutSignals,
  useBurnoutHeatmap,
  useBurnoutTrend,
  useCriticalEmployees,
  useEmployeeBurnout,
  useBurnoutDrivers,
} from './burnout';

// Interventions
export {
  useInterventions,
  useIntervention,
  useMyInterventions,
  useCreateIntervention,
  useUpdateInterventionStatus,
  useRecordInterventionOutcome,
  useInterventionRecommendations,
} from './interventions';

// Surveys
export {
  usePulseCycles,
  usePulseCycle,
  usePulseResults,
  usePendingSurveys,
  useSurveyStats,
  useCreatePulseCycle,
  useClosePulseCycle,
  useSubmitPulseResponse,
} from './surveys';

// Strengths
export { useStrengthProfile, useTeamStrengths } from './strengths';

// Career
export { useCareerPath, useGenerateCareerPath } from './career';

// Notifications
export {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
} from './notifications';

// Actions
export { useActions, useApproveAction, useRejectAction } from './actions';

// Admin
export {
  useTenantsAdmin,
  useTenant,
  useCreateTenant,
  useSuspendTenant,
  useAuditEvents,
} from './admin';

// ATS
export {
  useATSPositions,
  useCandidates,
  useApplicationPipeline,
  useMoveCandidate,
} from './ats';
