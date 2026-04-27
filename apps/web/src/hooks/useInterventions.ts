'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// ============================================================================
// Intervention Hooks — gateway /api/v1/interventions/*
// ============================================================================

export type InterventionCategory =
  | 'coaching'
  | 'workload'
  | 'flexibility'
  | 'recognition'
  | 'skill_dev'
  | 'wellbeing'
  | 'social_support'
  | 'role_design'
  | 'leadership'
  | 'environment'
  | 'other';

export type EvidenceTier = 'A' | 'B' | 'C';

export interface CatalogItem {
  id: string;
  code: string;
  title_tr: string;
  description_tr: string;
  category: InterventionCategory;
  evidence_tier: EvidenceTier;
  delivery_mode: string;
  expected_effect_size?: number | null;
  time_to_effect_weeks?: number | null;
  duration_weeks?: number | null;
  cost_tier?: string | null;
  active: boolean;
}

export const CATEGORY_LABEL: Record<InterventionCategory, string> = {
  coaching: 'Koçluk',
  workload: 'İş Yükü Yönetimi',
  flexibility: 'Esneklik',
  recognition: 'Takdir',
  skill_dev: 'Beceri Gelişimi',
  wellbeing: 'İyi Oluş',
  social_support: 'Sosyal Destek',
  role_design: 'Rol Tasarımı',
  leadership: 'Liderlik',
  environment: 'Çevre',
  other: 'Diğer',
};

export const TIER_LABEL: Record<EvidenceTier, string> = {
  A: 'A · Meta-analiz',
  B: 'B · Birden çok çalışma',
  C: 'C · Teorik',
};

/** Aktif müdahale kataloğu — modal listesi için. */
export function useInterventionCatalog() {
  const { getToken } = useAuth();

  return useQuery<CatalogItem[], Error>({
    queryKey: ['interventions', 'catalog'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      const raw = await apiFetch<
        { items: CatalogItem[]; total: number } | CatalogItem[]
      >('/api/v1/interventions/catalog?active=true&limit=100', {
        method: 'GET',
        token,
      });
      if (Array.isArray(raw)) return raw;
      return raw.items ?? [];
    },
  });
}

export interface AssignInterventionVars {
  intervention_id: string;
  employee_id: string;
  notes?: string;
  trigger_source?: 'manual' | 'action_center' | 'burnout_dashboard';
}

export interface InterventionAssignment {
  id: string;
  tenant_id: string;
  intervention_id: string;
  employee_id: string;
  assigned_by?: string | null;
  assigned_at: string;
  status:
    | 'assigned'
    | 'declined'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'lapsed';
  accepted_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
}

/** İK tarafı — tenant içindeki tüm assignment'ları listele. */
export function useInterventionAssignments(opts?: {
  status?: InterventionAssignment['status'];
  interventionId?: string;
  employeeId?: string;
  limit?: number;
}) {
  const { getToken } = useAuth();
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.interventionId) params.set('intervention_id', opts.interventionId);
  if (opts?.employeeId) params.set('assignee_employee_id', opts.employeeId);
  params.set('limit', String(opts?.limit ?? 50));

  return useQuery<{ items: InterventionAssignment[]; total: number }, Error>({
    queryKey: ['interventions', 'assignments', params.toString()],
    staleTime: 30_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ items: InterventionAssignment[]; total: number }>(
        `/api/v1/interventions/assignments?${params.toString()}`,
        { method: 'GET', token },
      );
    },
  });
}

// ============================================================================
// Effectiveness (Cohen's d + CI + trend) hooks — /effectiveness/*
// ============================================================================

export type EffectCategory = 'trivial' | 'small' | 'medium' | 'large' | 'insufficient';

export interface EffectivenessSummaryItem {
  intervention_id: string;
  code: string;
  title_tr: string;
  category: InterventionCategory;
  evidence_tier: EvidenceTier;
  n_total: number;
  n_completed: number;
  cohens_d: number | null;
  ci_low: number | null;
  ci_high: number | null;
  p_value: number | null;
  mean_pre: number | null;
  mean_post: number | null;
  avg_bat_drop: number | null;
  effect_category: EffectCategory;
  insufficient: boolean;
}

export interface EffectivenessSummaryResponse {
  generated_at: string;
  items: EffectivenessSummaryItem[];
}

export interface EffectivenessTrendPoint {
  week_start: string;
  n: number;
  cohens_d: number | null;
  ci_low: number | null;
  ci_high: number | null;
}

export interface EffectivenessTrendSeries {
  intervention_id: string;
  code: string;
  title_tr: string;
  points: EffectivenessTrendPoint[];
}

export interface EffectivenessTrendResponse {
  weeks: number;
  generated_at: string;
  series: EffectivenessTrendSeries[];
}

export interface EffectivenessOutcomeEntry {
  assignment_id: string;
  employee_id: string;
  pre_bat_score: number;
  post_bat_score: number;
  delta: number;
  success?: boolean | null;
  measured_at: string;
  horizon_weeks?: number | null;
}

export interface EffectivenessDetailResponse {
  summary: EffectivenessSummaryItem;
  trend: EffectivenessTrendPoint[];
  entries: EffectivenessOutcomeEntry[];
}

/** Tenant-wide Cohen's d + CI roll-up for the effectiveness panel. */
export function useInterventionEffectiveness() {
  const { getToken } = useAuth();
  return useQuery<EffectivenessSummaryResponse, Error>({
    queryKey: ['interventions', 'effectiveness', 'summary'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<EffectivenessSummaryResponse>(
        '/api/v1/interventions/effectiveness/summary',
        { method: 'GET', token },
      );
    },
  });
}

/** Single-intervention detail: summary + weekly trend + paired outcomes. */
export function useEffectivenessDetail(
  catalogId: string | null,
  weeks: number = 8,
) {
  const { getToken } = useAuth();
  return useQuery<EffectivenessDetailResponse, Error>({
    queryKey: ['interventions', 'effectiveness', 'detail', catalogId, weeks],
    enabled: Boolean(catalogId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<EffectivenessDetailResponse>(
        `/api/v1/interventions/effectiveness/${catalogId}/detail?weeks=${weeks}`,
        { method: 'GET', token },
      );
    },
  });
}

/** Aggregate weekly rolling Cohen's d across all interventions. */
export function useEffectivenessTrend(weeks: number = 8) {
  const { getToken } = useAuth();
  return useQuery<EffectivenessTrendResponse, Error>({
    queryKey: ['interventions', 'effectiveness', 'trends', weeks],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<EffectivenessTrendResponse>(
        `/api/v1/interventions/effectiveness/trends?weeks=${weeks}`,
        { method: 'GET', token },
      );
    },
  });
}

/** Müdahale atama — çalışana bir intervention assign eder. */
export function useAssignIntervention() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<{ id: string }, Error, AssignInterventionVars>({
    mutationFn: async (vars) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ id: string }>('/api/v1/interventions/assignments', {
        method: 'POST',
        body: {
          intervention_id: vars.intervention_id,
          employee_id: vars.employee_id,
          notes: vars.notes,
          trigger_source: vars.trigger_source ?? 'manual',
        },
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interventions', 'assignments'] });
      qc.invalidateQueries({ queryKey: ['burnout'] });
    },
  });
}
