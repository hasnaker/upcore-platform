'use client';

/**
 * usePip — PIP (Performans İyileştirme Planı) React Query hook'ları.
 *
 * Backend: services/performance — gateway via /api/v1/performance/pip
 * İş Kanunu 25/2 ile uyumlu iş akışı:
 *   draft → pending_legal → active ⇄ extended → {passed|terminated}
 *
 * Fesih (terminated) için legal_file_url zorunlu (mahkeme delili).
 */

import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery, useApiMutation } from './useApi';

/* ─── Types (mirror services/performance/internal/domain/pip.go) ─── */

export type PipReasonCategory =
  | 'performance'
  | 'attendance'
  | 'conduct'
  | 'competency';

export const PIP_REASON_LABEL_TR: Record<PipReasonCategory, string> = {
  performance: 'Performans',
  attendance: 'Devamsızlık',
  conduct: 'Davranış',
  competency: 'Kompetans',
};

export type PipStatus =
  | 'draft'
  | 'pending_legal'
  | 'active'
  | 'extended'
  | 'passed'
  | 'terminated';

export const PIP_STATUS_LABEL_TR: Record<PipStatus, string> = {
  draft: 'Taslak',
  pending_legal: 'Legal Onay Bekliyor',
  active: 'Aktif',
  extended: 'Uzatıldı',
  passed: 'Başarılı',
  terminated: 'Fesih',
};

export type PipPriority = 'low' | 'medium' | 'high';

export const PIP_PRIORITY_LABEL_TR: Record<PipPriority, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

export type PipCheckinTrack = 'on_track' | 'off_track';

export const PIP_TRACK_LABEL_TR: Record<PipCheckinTrack, string> = {
  on_track: 'Hedefte',
  off_track: 'Geride',
};

export type PipOutcomeResult = 'passed' | 'extended' | 'terminated';

export interface PipGoal {
  id: string;
  tenant_id: string;
  case_id: string;
  description: string;
  measurable_target: string;
  deadline: string;
  priority: PipPriority;
  created_at: string;
}

export interface PipCheckin {
  id: string;
  tenant_id: string;
  case_id: string;
  week_number: number;
  on_track: PipCheckinTrack;
  manager_notes?: string | null;
  employee_notes?: string | null;
  acknowledged_by_employee?: string | null;
  acknowledge_ip?: string | null;
  acknowledge_user_agent?: string | null;
  created_by: string;
  created_at: string;
}

export interface PipOutcome {
  id: string;
  tenant_id: string;
  case_id: string;
  result: PipOutcomeResult;
  legal_file_url?: string | null;
  outcome_notes?: string | null;
  closed_at: string;
  closed_by: string;
  created_at: string;
}

export interface PipCase {
  id: string;
  tenant_id: string;
  employee_id: string;
  initiated_by: string;
  hr_reviewer_id?: string | null;
  legal_reviewer_id?: string | null;
  legal_reviewed: boolean;
  reason_category: PipReasonCategory;
  reason_summary: string;
  start_date: string;
  duration_days: number;
  status: PipStatus;
  legal_file_url?: string | null;
  outcome_reason?: string | null;
  created_at: string;
  updated_at: string;
  goals?: PipGoal[];
  checkins?: PipCheckin[];
  outcome?: PipOutcome | null;
}

/** Status → closed / active helpers (mirror backend domain). */
export const isPipClosed = (s: PipStatus): boolean =>
  s === 'passed' || s === 'terminated';
export const isPipActive = (s: PipStatus): boolean =>
  s === 'active' || s === 'extended';

/* ─── List response envelope ─── */

interface Listed<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
}

/* ─── Query hooks ─── */

/** HR panel — all PIP cases for this tenant (filters: status, reason). */
export function usePipCases(params?: { status?: PipStatus; reason?: PipReasonCategory }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.reason) qs.set('reason', params.reason);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return useApiQuery<Listed<PipCase>>(
    ['pip', 'cases', params ?? {}],
    `/api/v1/performance/pip${suffix}`,
  );
}

/** Manager panel — own-team cases. */
export function useManagedPipCases() {
  return useApiQuery<Listed<PipCase>>(
    ['pip', 'cases', 'managed'],
    `/api/v1/performance/pip/managed`,
  );
}

/** Employee portal — own cases (read-only). */
export function useMyPipCases() {
  return useApiQuery<Listed<PipCase>>(
    ['pip', 'cases', 'mine'],
    `/api/v1/performance/pip/mine`,
  );
}

/** Single case detail. */
export function usePipCase(id: string | null | undefined) {
  return useApiQuery<PipCase>(
    ['pip', 'case', id ?? ''],
    `/api/v1/performance/pip/${id}`,
    { enabled: Boolean(id) },
  );
}

/* ─── Mutation hooks (with optimistic invalidation) ─── */

export interface InitiatePipInput {
  employee_id: string;
  hr_reviewer_id?: string;
  reason_category: PipReasonCategory;
  reason_summary: string;
  start_date: string;
  duration_days: 30 | 60 | 90;
  goals?: Array<{
    description: string;
    measurable_target: string;
    deadline: string;
    priority?: PipPriority;
  }>;
}

export function useInitiatePipCase() {
  const qc = useQueryClient();
  return useApiMutation<PipCase, InitiatePipInput>('/api/v1/performance/pip', {
    method: 'POST',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pip', 'cases'] });
    },
  });
}

export function useSubmitPipForLegal(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PipCase, { hr_reviewer_id?: string }>(
    `/api/v1/performance/pip/${id}/submit-legal`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['pip', 'case', id] });
        qc.invalidateQueries({ queryKey: ['pip', 'cases'] });
      },
    },
  );
}

export interface ApproveLegalInput {
  legal_file_url: string;
}

export function useApprovePipLegal(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PipCase, ApproveLegalInput>(
    `/api/v1/performance/pip/${id}/approve-legal`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['pip', 'case', id] });
        qc.invalidateQueries({ queryKey: ['pip', 'cases'] });
      },
    },
  );
}

export interface AddPipGoalInput {
  description: string;
  measurable_target: string;
  deadline: string;
  priority?: PipPriority;
}

export function useAddPipGoal(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PipGoal, AddPipGoalInput>(
    `/api/v1/performance/pip/${id}/goals`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['pip', 'case', id] });
      },
    },
  );
}

export interface AddPipCheckinInput {
  week_number: number;
  on_track: PipCheckinTrack;
  manager_notes?: string;
  employee_notes?: string;
}

export function useAddPipCheckin(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PipCheckin, AddPipCheckinInput>(
    `/api/v1/performance/pip/${id}/checkins`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['pip', 'case', id] });
      },
    },
  );
}

export interface AcknowledgePipCheckinInput {
  employee_notes?: string;
}

export function useAcknowledgePipCheckin(caseId: string) {
  const qc = useQueryClient();
  return useApiMutation<
    { ok: boolean; acknowledged_at: string },
    { checkinId: string } & AcknowledgePipCheckinInput
  >(
    (vars) => `/api/v1/performance/pip/checkins/${vars.checkinId}/acknowledge`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['pip', 'case', caseId] });
        qc.invalidateQueries({ queryKey: ['pip', 'cases'] });
      },
    },
  );
}

export interface ExtendPipInput {
  extension_days: 30 | 60 | 90;
  reason: string;
}

export function useExtendPipCase(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PipCase, ExtendPipInput>(
    `/api/v1/performance/pip/${id}/extend`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['pip', 'case', id] });
        qc.invalidateQueries({ queryKey: ['pip', 'cases'] });
      },
    },
  );
}

export interface ClosePipInput {
  legal_file_url?: string;
  outcome_reason: string;
  outcome_notes?: string;
}

export function useClosePipPassed(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PipCase, ClosePipInput>(
    `/api/v1/performance/pip/${id}/close-passed`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['pip', 'case', id] });
        qc.invalidateQueries({ queryKey: ['pip', 'cases'] });
      },
    },
  );
}

/** İş Kanunu 25/2 — legal_file_url zorunlu. */
export function useClosePipTerminated(id: string) {
  const qc = useQueryClient();
  return useApiMutation<PipCase, Required<Pick<ClosePipInput, 'legal_file_url'>> & ClosePipInput>(
    `/api/v1/performance/pip/${id}/close-terminated`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['pip', 'case', id] });
        qc.invalidateQueries({ queryKey: ['pip', 'cases'] });
      },
    },
  );
}

/** Build the PDF export URL (opens in new tab via window.open). */
export function buildPipPdfUrl(id: string): string {
  return `/api/v1/performance/pip/${id}/pdf`;
}
