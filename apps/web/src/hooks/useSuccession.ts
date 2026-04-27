'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery, useApiMutation } from './useApi';

/* ============================================================================
 * Succession (yedekleme) planlama hook'ları
 * Backend: services/mobility — gateway via /api/v1/mobility/succession-plans
 * ============================================================================ */

export type Readiness = 'ready_now' | 'ready_1y' | 'ready_2y';

export const READINESS_LABEL_TR: Record<Readiness, string> = {
  ready_now: 'Hazır Şimdi',
  ready_1y: '1 Yıl İçinde',
  ready_2y: '2 Yıl İçinde',
};

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const RISK_LABEL_TR: Record<RiskLevel, string> = {
  low: 'Düşük Risk',
  medium: 'Orta Risk',
  high: 'Yüksek Risk',
  critical: 'Kritik Risk',
};

/* ─── Backend DTOs ──────────────────────────────────────────────────────── */

export interface CriticalPosition {
  plan_id: string;
  position_id: string;
  position_title_tr: string;
  department_tr: string;
  risk_level: RiskLevel;
  criticality_tr: string;
  incumbent_employee_id: string;
  incumbent_full_name: string;
  candidate_count: number;
  ready_now_count: number;
  updated_at: string;
}

export interface SuccessionPlan {
  id: string;
  tenant_id: string;
  position_id: string;
  incumbent_employee_id: string;
  risk_level: RiskLevel;
  criticality_tr: string;
  created_at: string;
  updated_at: string;
}

export interface SuccessionCandidate {
  id: string;
  plan_id: string;
  candidate_employee_id: string;
  readiness: Readiness;
  fit_score: number;
  gaps_tr: string;
  rank: number;
  created_at: string;
  updated_at: string;
}

interface CriticalListResponse {
  items: CriticalPosition[];
  total: number;
}

interface CandidatesListResponse {
  candidates: SuccessionCandidate[];
  total: number;
}

/* ─── Read hooks ────────────────────────────────────────────────────────── */

/** GET /api/v1/mobility/succession-plans/critical — kritik pozisyonlar (enriched). */
export function useCriticalPositions() {
  return useApiQuery<CriticalListResponse>(
    ['mobility', 'succession', 'critical'],
    '/api/v1/mobility/succession-plans/critical',
  );
}

/** GET /api/v1/mobility/succession-plans/{planId} — tek plan. */
export function useSuccessionPlan(planId: string | null | undefined) {
  return useApiQuery<SuccessionPlan>(
    ['mobility', 'succession', 'plan', planId ?? ''],
    `/api/v1/mobility/succession-plans/${planId}`,
    { enabled: Boolean(planId) },
  );
}

/** GET /api/v1/mobility/succession-plans/{planId}/candidates — havuz aday listesi. */
export function usePositionPool(planId: string | null | undefined) {
  return useApiQuery<CandidatesListResponse>(
    ['mobility', 'succession', 'candidates', planId ?? ''],
    `/api/v1/mobility/succession-plans/${planId}/candidates`,
    { enabled: Boolean(planId) },
  );
}

/* ─── Write hooks ───────────────────────────────────────────────────────── */

/** POST .../{planId}/candidates — havuza aday ekle. */
export function useAddCandidate(planId: string) {
  const qc = useQueryClient();
  return useApiMutation<
    SuccessionCandidate,
    {
      candidate_employee_id: string;
      readiness: Readiness;
      fit_score?: number;
      gaps_tr?: string;
      rank?: number;
    }
  >(`/api/v1/mobility/succession-plans/${planId}/candidates`, {
    method: 'POST',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobility', 'succession', 'candidates', planId] });
      qc.invalidateQueries({ queryKey: ['mobility', 'succession', 'critical'] });
    },
  });
}

/** PATCH .../{planId}/candidates/{candidateId} — readiness (ve opsiyonel fit/gaps/rank) güncelle. */
export function useUpdateReadiness(planId: string) {
  const qc = useQueryClient();
  return useApiMutation<
    SuccessionCandidate,
    {
      candidate_id: string;
      readiness: Readiness;
      fit_score?: number;
      gaps_tr?: string;
      rank?: number;
    }
  >(
    (vars) =>
      `/api/v1/mobility/succession-plans/${planId}/candidates/${vars.candidate_id}`,
    {
      method: 'PATCH',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['mobility', 'succession', 'candidates', planId] });
        qc.invalidateQueries({ queryKey: ['mobility', 'succession', 'critical'] });
      },
    },
  );
}

/** DELETE .../{planId}/candidates/{candidateId} — havuzdan çıkar. */
export function useRemoveCandidate(planId: string) {
  const qc = useQueryClient();
  return useApiMutation<{ ok: true }, { candidate_id: string }>(
    (vars) =>
      `/api/v1/mobility/succession-plans/${planId}/candidates/${vars.candidate_id}`,
    {
      method: 'DELETE',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['mobility', 'succession', 'candidates', planId] });
        qc.invalidateQueries({ queryKey: ['mobility', 'succession', 'critical'] });
      },
    },
  );
}

/** POST /api/v1/mobility/succession-plans — plan oluştur/güncelle. */
export function useUpsertSuccessionPlan() {
  const qc = useQueryClient();
  return useApiMutation<
    SuccessionPlan,
    {
      position_id: string;
      incumbent_employee_id: string;
      risk_level: RiskLevel;
      criticality_tr: string;
    }
  >('/api/v1/mobility/succession-plans', {
    method: 'POST',
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobility', 'succession', 'critical'] });
    },
  });
}
