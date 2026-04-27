'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// ============================================================================
// Survey Hooks — gateway /api/v1/surveys/*
// Backend: services/survey (Go)
// ============================================================================

export type SurveyType = 'pulse' | 'onboarding' | 'exit' | 'engagement' | 'custom';
export type SurveyStatus = 'draft' | 'scheduled' | 'active' | 'closed' | 'archived';

export interface Survey {
  id: string;
  tenant_id: string;
  instrument_id?: string | null;
  title_tr: string;
  title_en?: string | null;
  description_tr?: string | null;
  survey_type: SurveyType;
  is_anonymous: boolean;
  cadence?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status: SurveyStatus;
  created_at: string;
  updated_at: string;
}

export interface SurveyListResponse {
  items: Survey[];
  total: number;
  page?: number;
  limit?: number;
}

/** Tenant'ın tüm anketleri (pulse + custom). */
export function useSurveys(params: { status?: SurveyStatus; limit?: number } = {}) {
  const { getToken } = useAuth();
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.limit) q.set('limit', String(params.limit));

  return useQuery<SurveyListResponse, Error>({
    queryKey: ['surveys', 'list', params],
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<SurveyListResponse>(`/api/v1/surveys?${q.toString()}`, {
        method: 'GET',
        token,
      });
    },
  });
}

export interface SurveyItem {
  id: string;
  survey_id: string;
  code: string;
  question_tr: string;
  question_en?: string | null;
  scale_type: string;
  scale_min?: number;
  scale_max?: number;
  dimension?: string;
  order_index: number;
  is_required?: boolean;
}

export function useSurveyItems(code: string | null | undefined) {
  const { getToken } = useAuth();

  return useQuery<{ items: SurveyItem[] }, Error>({
    queryKey: ['surveys', 'items', code],
    enabled: !!code,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ items: SurveyItem[] }>(`/api/v1/surveys/${code}/items`, {
        method: 'GET',
        token,
      });
    },
  });
}

export interface CreateSurveyInput {
  title_tr: string;
  description_tr?: string;
  survey_type: SurveyType;
  is_anonymous?: boolean;
  starts_at?: string;
  ends_at?: string;
  instrument_code?: string; // 'bat12_tr' | 'copsoq_iii_tr' | 'uwes9'
}

export function useCreateSurvey() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<Survey, Error, CreateSurveyInput>({
    mutationFn: async (input) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<Survey>('/api/v1/surveys', {
        method: 'POST',
        body: input,
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys', 'list'] });
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Distributions
// ──────────────────────────────────────────────────────────────────────────

export interface Distribution {
  id: string;
  survey_id: string;
  tenant_id: string;
  status: string; // scheduled|active|closed
  opens_at: string;
  closes_at: string;
  invitations_sent: number;
  responses_received: number;
  response_rate?: number;
  created_at: string;
}

export function useDistributions(params: { limit?: number } = {}) {
  const { getToken } = useAuth();
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));

  return useQuery<{ items: Distribution[]; total: number }, Error>({
    queryKey: ['surveys', 'distributions', params],
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ items: Distribution[]; total: number }>(
        `/api/v1/surveys/distributions?${q.toString()}`,
        { method: 'GET', token },
      );
    },
  });
}
