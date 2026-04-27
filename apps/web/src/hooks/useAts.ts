'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// ============================================================================
// ATS Hooks — gateway /api/v1/ats/*
// Backend: services/ats (Go)
// ============================================================================

export type ATSStage =
  | 'applied'
  | 'screened'
  | 'assessed'
  | 'interviewed'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export const STAGE_LABEL: Record<ATSStage, string> = {
  applied: 'Başvurdu',
  screened: 'CV Tarandı',
  assessed: 'Değerlendirildi',
  interviewed: 'Mülakatta',
  offered: 'Teklif Sunuldu',
  hired: 'İşe Alındı',
  rejected: 'Reddedildi',
  withdrawn: 'Geri Çekildi',
};

export const ACTIVE_STAGES: ATSStage[] = [
  'applied',
  'screened',
  'assessed',
  'interviewed',
  'offered',
  'hired',
];

export interface Requisition {
  id: string;
  tenant_id: string;
  position_id?: string | null;
  title: string;
  description: string;
  requirements?: string | null;
  headcount: number;
  location?: string | null;
  employment_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  tenant_id: string;
  candidate_id: string;
  requisition_id: string;
  current_stage: ATSStage;
  stage_entered_at: string;
  score?: number | null;
  rejection_reason?: string | null;
  applied_at: string;
  updated_at: string;
  // Joined fields (backend may decorate)
  candidate?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
  };
}

export interface KanbanColumn {
  stage: ATSStage;
  count: number;
  applications: Application[];
}

export interface KanbanBoard {
  requisition_id: string;
  stages: KanbanColumn[];
}

/** Açık ilan (requisition) listesi — ATS giriş sayfası için. */
export function useRequisitions(params: { status?: string; limit?: number } = {}) {
  const { getToken } = useAuth();
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.limit) q.set('limit', String(params.limit));

  return useQuery<{ items: Requisition[]; total: number }, Error>({
    queryKey: ['ats', 'requisitions', params],
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ items: Requisition[]; total: number }>(
        `/api/v1/ats/requisitions?${q.toString()}`,
        { method: 'GET', token },
      );
    },
  });
}

/** Requisition Kanban board — 8 stage grid. */
export function useRequisitionBoard(requisitionId: string | null | undefined) {
  const { getToken } = useAuth();

  return useQuery<KanbanBoard, Error>({
    queryKey: ['ats', 'board', requisitionId],
    enabled: !!requisitionId,
    staleTime: 30_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<KanbanBoard>(
        `/api/v1/ats/requisitions/${requisitionId}/board`,
        { method: 'GET', token },
      );
    },
  });
}

export interface MoveApplicationVars {
  applicationId: string;
  to_stage: ATSStage;
  reason?: string;
}

/** Adayı stage'ler arası taşı (kanban drag&drop). */
export function useMoveApplication() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<Application, Error, MoveApplicationVars>({
    mutationFn: async ({ applicationId, to_stage, reason }) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<Application>(
        `/api/v1/ats/applications/${applicationId}/move`,
        {
          method: 'POST',
          body: { to_stage, reason },
          token,
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ats', 'board'] });
      qc.invalidateQueries({ queryKey: ['ats', 'applications'] });
    },
  });
}

/** Aday reddi — detaylı rejection_reason ile. */
export function useRejectApplication() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<Application, Error, { applicationId: string; reason: string }>({
    mutationFn: async ({ applicationId, reason }) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<Application>(
        `/api/v1/ats/applications/${applicationId}/reject`,
        { method: 'POST', body: { reason }, token },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ats', 'board'] });
    },
  });
}

export interface Candidate {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  linkedin_url?: string | null;
  source: string;
  tags: string[];
  gdpr_consent: boolean;
  created_at: string;
}

export function useCandidates(params: { search?: string; limit?: number } = {}) {
  const { getToken } = useAuth();
  const q = new URLSearchParams();
  if (params.search) q.set('q', params.search);
  if (params.limit) q.set('limit', String(params.limit));

  return useQuery<{ items: Candidate[]; total: number }, Error>({
    queryKey: ['ats', 'candidates', params],
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ items: Candidate[]; total: number }>(
        `/api/v1/ats/candidates?${q.toString()}`,
        { method: 'GET', token },
      );
    },
  });
}
