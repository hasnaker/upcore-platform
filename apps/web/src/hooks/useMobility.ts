'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery, useApiMutation } from './useApi';

/* ─── Types — services/mobility/internal/domain ─── */

export type RotationStatus = 'proposed' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';

export interface Rotation {
  id: string;
  tenant_id: string;
  employee_id: string;
  from_department_id?: string | null;
  to_department_id: string;
  from_position_id?: string | null;
  to_position_id: string;
  rotation_type: 'lateral' | 'promotion' | 'secondment' | 'cross_functional';
  status: RotationStatus;
  planned_start_date: string;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  reason?: string | null;
  proposed_by?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareerPathStep {
  id: string;
  path_id: string;
  step_order: number;
  position_id: string;
  position_title_tr: string;
  target_months_from_start: number;
  prerequisites?: string[];
  notes?: string | null;
}

export interface CareerPath {
  id: string;
  tenant_id: string;
  name_tr: string;
  description?: string | null;
  target_role_family: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  steps?: CareerPathStep[];
}

export interface SuccessionPlan {
  id: string;
  tenant_id: string;
  position_id: string;
  position_title_tr: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  incumbent_id?: string | null;
  successor_pool_size: number;
  updated_at: string;
}

export interface SuccessionCandidate {
  id: string;
  plan_id: string;
  employee_id: string;
  employee_name: string;
  readiness_level: 'ready_now' | '1_2_years' | '3_5_years' | 'successor_pool';
  performance_rating?: number | null;
  potential_rating?: number | null;
  added_at: string;
}

interface Listed<T> {
  items: T[];
  total?: number;
}

/* ─── Rotations ─── */

// Gateway-backed rotation workflow. The Next.js `/api/mobility/rotations/*`
// routes inject X-Tenant-Id / X-User-Id / X-User-Role and proxy to the Go
// mobility service. Using plain fetch here mirrors the marketplace pattern.

export interface RotationRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  from_position_id: string;
  to_position_id: string;
  from_department_id: string;
  to_department_id: string;
  status: 'proposed' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';
  reason_tr: string;
  start_date?: string | null;
  end_date?: string | null;
  approved_by_id?: string | null;
  approved_at?: string | null;
  requested_by_id: string;
  created_at: string;
  updated_at: string;
  // Enriched server-side fields surfaced when available.
  employee_full_name?: string;
  from_position_title?: string;
  to_position_title?: string;
  from_department_name?: string;
  to_department_name?: string;
}

export interface CreateRotationInput {
  employee_id: string;
  from_position_id: string;
  to_position_id: string;
  from_department_id: string;
  to_department_id: string;
  reason_tr: string;
  start_date?: string;
  end_date?: string;
}

export type RotationPendingRole = 'current_manager' | 'target_manager' | 'hr';

export function useMyRotations(employeeId: string | null | undefined) {
  return useQuery<{ rotations: RotationRow[]; total: number }, Error>({
    queryKey: ['mobility', 'rotations', 'mine', employeeId ?? ''],
    queryFn: () =>
      mobilityFetch<{ rotations: RotationRow[]; total: number }>(
        `/api/mobility/rotations/employee/${employeeId}`,
      ),
    enabled: Boolean(employeeId),
    staleTime: 30_000,
  });
}

export function usePendingRotations(role: RotationPendingRole) {
  return useQuery<{ rotations: RotationRow[]; total: number }, Error>({
    queryKey: ['mobility', 'rotations', 'pending', role],
    queryFn: () =>
      mobilityFetch<{ rotations: RotationRow[]; total: number }>(
        `/api/mobility/rotations/pending?role=${role}`,
      ),
    staleTime: 15_000,
  });
}

export function useCreateRotation() {
  const qc = useQueryClient();
  return useMutation<RotationRow, Error, CreateRotationInput>({
    mutationFn: (input) =>
      mobilityFetch<RotationRow>('/api/mobility/rotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobility', 'rotations'] }),
  });
}

export function useApproveRotation() {
  const qc = useQueryClient();
  return useMutation<{ status: string }, Error, { id: string }>({
    mutationFn: ({ id }) =>
      mobilityFetch<{ status: string }>(`/api/mobility/rotations/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobility', 'rotations'] }),
  });
}

export function useRejectRotation() {
  const qc = useQueryClient();
  return useMutation<{ status: string }, Error, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) =>
      mobilityFetch<{ status: string }>(`/api/mobility/rotations/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobility', 'rotations'] }),
  });
}

export function useCompleteRotation() {
  const qc = useQueryClient();
  return useMutation<{ status: string }, Error, { id: string }>({
    mutationFn: ({ id }) =>
      mobilityFetch<{ status: string }>(`/api/mobility/rotations/${id}/complete`, {
        method: 'POST',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobility', 'rotations'] }),
  });
}

// Legacy shim kept for existing callers that used the useApi.ts wrapper.
export function useEmployeeRotations(employeeId: string | null | undefined) {
  return useApiQuery<Listed<Rotation>>(
    ['mobility', 'rotations', 'legacy', employeeId ?? ''],
    `/api/v1/mobility/employees/${employeeId}/rotations`,
    { enabled: Boolean(employeeId) },
  );
}

/* ─── Career Paths ─── */

export function useCareerPaths() {
  return useApiQuery<Listed<CareerPath>>(
    ['mobility', 'careerPaths'],
    '/api/v1/mobility/career-paths',
  );
}

export function useCareerPath(id: string | null | undefined) {
  return useApiQuery<CareerPath>(
    ['mobility', 'careerPath', id ?? ''],
    `/api/v1/mobility/career-paths/${id}`,
    { enabled: Boolean(id) },
  );
}

export function useCreateCareerPath() {
  const qc = useQueryClient();
  return useApiMutation<
    CareerPath,
    { name_tr: string; description?: string; target_role_family: string }
  >('/api/v1/mobility/career-paths', {
    method: 'POST',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobility', 'careerPaths'] }),
  });
}

export function useAddCareerPathStep(pathId: string) {
  const qc = useQueryClient();
  return useApiMutation<
    CareerPathStep,
    {
      position_id: string;
      step_order: number;
      target_months_from_start: number;
      prerequisites?: string[];
      notes?: string;
    }
  >(`/api/v1/mobility/career-paths/${pathId}/steps`, {
    method: 'POST',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobility', 'careerPath', pathId] });
      qc.invalidateQueries({ queryKey: ['mobility', 'careerPaths'] });
    },
  });
}

/* ─── Succession ─── */

export function useSuccessionPlans() {
  return useApiQuery<Listed<SuccessionPlan>>(
    ['mobility', 'succession', 'plans'],
    '/api/v1/mobility/succession-plans',
  );
}

export function useSuccessionCandidates(planId: string | null | undefined) {
  return useApiQuery<Listed<SuccessionCandidate>>(
    ['mobility', 'succession', 'candidates', planId ?? ''],
    `/api/v1/mobility/succession-plans/${planId}/candidates`,
    { enabled: Boolean(planId) },
  );
}

export function useUpsertSuccessionPlan() {
  const qc = useQueryClient();
  return useApiMutation<
    SuccessionPlan,
    { position_id: string; criticality: SuccessionPlan['criticality']; incumbent_id?: string }
  >('/api/v1/mobility/succession-plans', {
    method: 'POST',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mobility', 'succession', 'plans'] }),
  });
}

export function useAddSuccessionCandidate(planId: string) {
  const qc = useQueryClient();
  return useApiMutation<
    SuccessionCandidate,
    { employee_id: string; readiness_level: SuccessionCandidate['readiness_level'] }
  >(`/api/v1/mobility/succession-plans/${planId}/candidates`, {
    method: 'POST',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobility', 'succession', 'candidates', planId] });
      qc.invalidateQueries({ queryKey: ['mobility', 'succession', 'plans'] });
    },
  });
}

/* ─── Marketplace (dahili kariyer ilanları) ─── */
// The Next.js /api/mobility/* routes wrap the gateway with request-context
// headers — Clerk's `upcore` JWT is applied upstream by the gateway proxy,
// so these hooks can use plain fetch against the Next API.

export type OpportunityType =
  | 'permanent'
  | 'rotation'
  | 'project'
  | 'mentorship'
  | 'secondment';

export type OpportunityStatus = 'draft' | 'open' | 'closed' | 'filled' | 'cancelled';

export type ApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'withdrawn'
  | 'rejected'
  | 'accepted';

export interface Opportunity {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  is_remote: boolean;
  opportunity_type: OpportunityType;
  required_skills: string[];
  preferred_skills: string[];
  posted_by: string;
  posted_at: string;
  closes_at?: string | null;
  status: OpportunityStatus;
}

export interface Application {
  id: string;
  tenant_id: string;
  opportunity_id: string;
  employee_id: string;
  cover_note?: string | null;
  match_score?: number | null;
  status: ApplicationStatus;
  confidential: boolean;
  applied_at: string;
  decided_at?: string | null;
  decision_notes?: string | null;
}

// HR-facing view may mask employee_id and append an alias for confidential apps.
export interface HRApplicationView extends Omit<Application, 'employee_id'> {
  employee_id: string | null;
  applicant_alias: string | null;
}

export interface FitScoreResponse {
  opportunity_id: string;
  employee_id: string;
  score: number;
  required_skills: string[];
  preferred_skills: string[];
  employee_skills: string[];
  missing_skills: string[];
}

async function mobilityFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { cache: 'no-store', ...init });
  if (!r.ok) {
    const body = (await r.json().catch(() => null)) as { error?: { message?: string } | string } | null;
    const msg =
      typeof body?.error === 'string'
        ? body.error
        : body?.error?.message || `HTTP ${r.status}`;
    throw Object.assign(new Error(msg), { status: r.status, body });
  }
  return (await r.json()) as T;
}

export function useOpportunityDetail(id: string | null | undefined) {
  return useQuery<Opportunity, Error>({
    queryKey: ['mobility', 'opportunity', id ?? ''],
    queryFn: () => mobilityFetch<Opportunity>(`/api/mobility/opportunities/${id}`),
    enabled: Boolean(id),
  });
}

export function useMyApplications(employeeId: string | null | undefined) {
  return useQuery<{ items: Application[] }, Error>({
    queryKey: ['mobility', 'applications', 'employee', employeeId ?? ''],
    queryFn: () =>
      mobilityFetch<{ items: Application[] }>(
        `/api/mobility/employees/${employeeId}/applications`,
      ),
    enabled: Boolean(employeeId),
  });
}

export function useOpportunityApplications(opportunityId: string | null | undefined) {
  return useQuery<{ items: HRApplicationView[] }, Error>({
    queryKey: ['mobility', 'applications', 'opportunity', opportunityId ?? ''],
    queryFn: () =>
      mobilityFetch<{ items: HRApplicationView[] }>(
        `/api/mobility/opportunities/${opportunityId}/applications`,
      ),
    enabled: Boolean(opportunityId),
  });
}

export function useOpportunityFit(
  opportunityId: string | null | undefined,
  employeeId: string | null | undefined,
) {
  return useQuery<FitScoreResponse, Error>({
    queryKey: ['mobility', 'fit', opportunityId ?? '', employeeId ?? ''],
    queryFn: () =>
      mobilityFetch<FitScoreResponse>(
        `/api/mobility/opportunities/${opportunityId}/fit/${employeeId}`,
      ),
    enabled: Boolean(opportunityId && employeeId),
  });
}

export interface ApplyInput {
  employee_id?: string;
  cover_note?: string;
  candidate_skills?: string[];
  confidential?: boolean;
}

export function useApplyOpportunity(opportunityId: string) {
  const qc = useQueryClient();
  return useMutation<Application, Error, ApplyInput>({
    mutationFn: async (input) =>
      mobilityFetch<Application>(`/api/mobility/opportunities/${opportunityId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobility', 'opportunity', opportunityId] });
      qc.invalidateQueries({ queryKey: ['mobility', 'applications'] });
      qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation<
    { ok: boolean; status: ApplicationStatus },
    Error,
    { applicationId: string; status: ApplicationStatus; decision_notes?: string; opportunityId?: string }
  >({
    mutationFn: ({ applicationId, status, decision_notes }) =>
      mobilityFetch<{ ok: boolean; status: ApplicationStatus }>(
        `/api/mobility/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, decision_notes }),
        },
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['mobility', 'applications'] });
      if (variables.opportunityId) {
        qc.invalidateQueries({
          queryKey: ['mobility', 'applications', 'opportunity', variables.opportunityId],
        });
      }
    },
  });
}

export function useWithdrawApplication() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean; status: 'withdrawn' }, Error, { applicationId: string }>({
    mutationFn: ({ applicationId }) =>
      mobilityFetch<{ ok: boolean; status: 'withdrawn' }>(
        `/api/mobility/applications/${applicationId}/withdraw`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobility', 'applications'] });
    },
  });
}

// Badge threshold helper used across detail + HR list.
export function fitBadgeVariant(score: number): 'green' | 'amber' | 'red' {
  if (score >= 0.7) return 'green';
  if (score >= 0.4) return 'amber';
  return 'red';
}
