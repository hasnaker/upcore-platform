'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery, useApiMutation } from './useApi';

/* ─── Types — services/assessment/internal/domain/Assessment ─── */

export type AssessmentStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'scored'
  | 'expired'
  | 'cancelled';

export interface Assessment {
  id: string;
  tenant_id: string;
  employee_id?: string | null;
  candidate_email?: string | null;
  candidate_name?: string | null;
  instrument_code: string;
  status: AssessmentStatus;
  candidate_token: string;
  assigned_by?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AssessmentScore {
  id: string;
  assessment_id: string;
  scale_code: string;
  scale_name: string;
  raw_score: number;
  t_score?: number | null;
  percentile?: number | null;
  risk_level?: string | null;
  norm_group?: string | null;
  scored_at: string;
}

export interface AssessmentResults {
  assessment: Assessment;
  scores: AssessmentScore[];
  report_ready: boolean;
  report_url?: string | null;
}

interface Listed<T> {
  items: T[];
  total?: number;
}

/* ─── HR-facing (JWT required) ─── */

export function useAssessments(params: {
  instrument_code?: string;
  status?: AssessmentStatus;
  employee_id?: string;
} = {}) {
  const qs = new URLSearchParams();
  if (params.instrument_code) qs.set('instrument_code', params.instrument_code);
  if (params.status) qs.set('status', params.status);
  if (params.employee_id) qs.set('employee_id', params.employee_id);
  const suffix = qs.toString() ? `?${qs}` : '';
  return useApiQuery<Listed<Assessment>>(
    ['assessments', params],
    `/api/v1/assessments${suffix}`,
  );
}

export function useAssessment(id: string | null | undefined) {
  return useApiQuery<Assessment>(
    ['assessment', id ?? ''],
    `/api/v1/assessments/${id}`,
    { enabled: Boolean(id) },
  );
}

export function useAssessmentResults(id: string | null | undefined) {
  return useApiQuery<AssessmentResults>(
    ['assessment', id ?? '', 'results'],
    `/api/v1/assessments/${id}/results`,
    { enabled: Boolean(id) },
  );
}

export interface CreateAssessmentInput {
  instrument_code: string;
  employee_id?: string;
  candidate_email?: string;
  candidate_name?: string;
  expires_at?: string; // ISO
  metadata?: Record<string, unknown>;
}

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useApiMutation<Assessment, CreateAssessmentInput>('/api/v1/assessments', {
    method: 'POST',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assessments'] }),
  });
}

export function useTriggerReport(id: string) {
  const qc = useQueryClient();
  return useApiMutation<{ report_url?: string }, Record<string, never>>(
    `/api/v1/assessments/${id}/report`,
    {
      method: 'POST',
      onSuccess: () => qc.invalidateQueries({ queryKey: ['assessment', id] }),
    },
  );
}

/* ─── Shared instrument catalog ─── */

export const INSTRUMENT_CATALOG: Array<{
  code: string;
  name_tr: string;
  duration_min: number;
  description_tr: string;
  scale_count: number;
}> = [
  {
    code: 'bat-12-tr',
    name_tr: 'BAT-12-TR (Tükenmişlik)',
    duration_min: 5,
    scale_count: 4,
    description_tr: 'Burnout Assessment Tool — 12 item, 4 boyut (tükenme, bilişsel, duygusal, psikolojik mesafe).',
  },
  {
    code: 'copsoq-iii-tr',
    name_tr: 'COPSOQ-III-TR (Psikososyal İş)',
    duration_min: 15,
    scale_count: 32,
    description_tr: 'Copenhagen Psychosocial Questionnaire — iş yükü, kontrol, anlam, sosyal destek.',
  },
  {
    code: 'uwes-9',
    name_tr: 'UWES-9 (İş Adanmışlığı)',
    duration_min: 4,
    scale_count: 3,
    description_tr: 'Utrecht Work Engagement Scale — enerji, adanmışlık, odaklanma.',
  },
  {
    code: 'upcap-tr',
    name_tr: 'UpCap-TR (Psikolojik Kaynak)',
    duration_min: 6,
    scale_count: 4,
    description_tr: 'Umut, öz yeterlik, dayanıklılık, iyimserlik — CPC-12 bazlı TR adaptasyon.',
  },
  {
    code: 'via-24',
    name_tr: 'VIA Güçlü Yönler',
    duration_min: 12,
    scale_count: 24,
    description_tr: '24 karakter gücü envanteri (Peterson & Seligman).',
  },
];

export function instrumentLabel(code: string): string {
  return INSTRUMENT_CATALOG.find((i) => i.code === code)?.name_tr ?? code;
}
