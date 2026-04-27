'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useAuthMe } from './useAuthMe';

// ============================================================================
// Action Center (ml-services/action-center) — kontrat tipler
// POST /api/v1/actions/next    → top-5 prioritized actions
// GET  /api/v1/actions/history/{user_id}
// POST /api/v1/actions/dismiss | /complete | /snooze
// ============================================================================

export type ActionRole =
  | 'hr_director'
  | 'people_partner'
  | 'line_manager'
  | 'employee'
  | 'executive';

export interface ActionTarget {
  employee_id: string | null;
  team_id: string | null;
  name_masked: string;
}

export interface CTAHint {
  label_tr?: string;
  href?: string;
}

export interface RankedAction {
  action_id: string;
  type: string;
  target: ActionTarget;
  priority_score: number;
  urgency: number;
  impact: number;
  actionability: number;
  user_relevance: number;
  title_tr: string;
  rationale_tr: string;
  suggested_within_hours: number;
  supporting_signals: string[];
  cta: CTAHint;
}

export interface NextActionsResponse {
  actions: RankedAction[];
  cached: boolean;
  generated_at: string;
  ttl_seconds: number;
}

interface Scope {
  department_ids?: string[];
  team_ids?: string[];
}

interface NextActionsRequest {
  tenant_id: string;
  user_id: string;
  role: ActionRole;
  scope?: Scope;
  language?: string;
}

const roleFromBackendRoles = (roles: string[]): ActionRole => {
  if (roles.includes('hr_director') || roles.includes('hr_admin') || roles.includes('owner'))
    return 'hr_director';
  if (roles.includes('hr_manager') || roles.includes('people_partner')) return 'people_partner';
  if (roles.includes('manager') || roles.includes('line_manager')) return 'line_manager';
  if (roles.includes('executive') || roles.includes('ceo') || roles.includes('cxo'))
    return 'executive';
  return 'employee';
};

/**
 * Kullanıcının rolüne ve tenant'ına göre kendisine özel TOP-5 aksiyon listesi.
 * Boş dönebilir (o an aksiyon yoksa), hata dönebilir (backend'e erişim yoksa).
 */
export function usePriorityActions() {
  const { getToken } = useAuth();
  const me = useAuthMe();

  return useQuery<NextActionsResponse, Error>({
    queryKey: ['actions', 'next', me.data?.id, me.tenantId],
    enabled: !!me.data?.id && !!me.tenantId,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      const body: NextActionsRequest = {
        tenant_id: me.tenantId!,
        user_id: me.data!.id,
        role: roleFromBackendRoles(me.roles),
        language: 'tr-TR',
      };
      return apiFetch<NextActionsResponse>('/api/v1/actions/next', {
        method: 'POST',
        body,
        token,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Weekly recap — panel "Bu Hafta" bölümü için agregasyon
// ---------------------------------------------------------------------------

export interface RecapBreakdownItem {
  label_tr: string;
  value: number;
}

export interface RecapMetric {
  key: string;
  label_tr: string;
  value: number;
  change_vs_prev: number;
  breakdown: RecapBreakdownItem[];
}

export interface RecapResponse {
  period: '7d' | '14d' | '30d';
  generated_at: string;
  metrics: RecapMetric[];
}

/** Haftalık/aylık aksiyon özeti — panel "Bu Hafta" bölümü. */
export function useWeeklyRecap(period: '7d' | '14d' | '30d' = '7d') {
  const { getToken } = useAuth();

  return useQuery<RecapResponse, Error>({
    queryKey: ['actions', 'recap', period],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<RecapResponse>(`/api/v1/actions/recap?period=${period}`, {
        method: 'GET',
        token,
      });
    },
  });
}

export interface ActionFeedbackVars {
  action_id: string;
  feedback_type: 'dismiss' | 'complete' | 'snooze';
  snooze_hours?: number;
  outcome_notes?: string;
}

/**
 * Bir aksiyonu onayla/red et/ertele. Başarılı olunca usePriorityActions
 * sonuçları invalidate edilir.
 */
export function useActionFeedback() {
  const { getToken } = useAuth();
  const me = useAuthMe();

  return useMutation<{ ok: true }, Error, ActionFeedbackVars>({
    mutationFn: async (vars) => {
      const token = await getToken({ template: 'upcore' });
      const path = `/api/v1/actions/${vars.feedback_type}`;
      return apiFetch<{ ok: true }>(path, {
        method: 'POST',
        body: {
          tenant_id: me.tenantId,
          user_id: me.data?.id,
          ...vars,
        },
        token,
      });
    },
  });
}
