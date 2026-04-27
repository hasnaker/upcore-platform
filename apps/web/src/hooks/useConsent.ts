'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api-client';
import type { CatalogItem } from './useInterventions';

// ============================================================================
// Consent & Assignment Hooks — Koruma modülü çalışan onay akışı
// gateway /api/v1/interventions/assignments/{id}/consent
// ============================================================================

export type AssignmentStatus =
  | 'assigned'
  | 'declined'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'lapsed';

export interface AssignmentDetail {
  id: string;
  tenant_id: string;
  intervention_id: string;
  employee_id: string;
  assigned_by?: string | null;
  assigned_at: string;
  starts_at?: string | null;
  ends_at?: string | null;
  status: AssignmentStatus;
  accepted_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  rationale_tr?: string | null;
  // Embedded by frontend from catalog hook; not in API response.
  catalog?: CatalogItem;
}

export interface ConsentLog {
  id: string;
  tenant_id: string;
  assignment_id: string;
  employee_id: string;
  action: 'granted' | 'declined' | 'revoked';
  reason?: string | null;
  actor_ip: string;
  user_agent?: string;
  created_at: string;
}

export type ConsentAction = 'granted' | 'declined' | 'revoked';

export interface SubmitConsentVars {
  assignmentId: string;
  action: ConsentAction;
  reason?: string;
}

/**
 * Tek bir assignment'i detay olarak çek. 403 durumunda caller
 * "başkasının kararı" mesajını göstermeli.
 */
export function useAssignment(assignmentId: string | null | undefined) {
  const { getToken } = useAuth();
  return useQuery<AssignmentDetail, ApiError | Error>({
    queryKey: ['interventions', 'assignments', assignmentId],
    enabled: !!assignmentId,
    staleTime: 30_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<AssignmentDetail>(
        `/api/v1/interventions/assignments/${assignmentId}`,
        { method: 'GET', token },
      );
    },
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Tek bir catalog item'i — assignment detayına göre getir.
 * Assignment detayı intervention_id içerir ama metadatanı ayrı çekmek gerekir.
 */
export function useCatalogItem(interventionId: string | null | undefined) {
  const { getToken } = useAuth();
  return useQuery<CatalogItem, Error>({
    queryKey: ['interventions', 'catalog', interventionId],
    enabled: !!interventionId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<CatalogItem>(
        `/api/v1/interventions/catalog/${interventionId}`,
        { method: 'GET', token },
      );
    },
  });
}

/** Consent gönder: Kabul / Red / Geri çekme. */
export function useSubmitConsent() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<{ status: string }, ApiError | Error, SubmitConsentVars>({
    mutationFn: async (vars) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ status: string }>(
        `/api/v1/interventions/assignments/${vars.assignmentId}/consent`,
        {
          method: 'POST',
          token,
          body: {
            action: vars.action,
            reason: vars.reason?.trim() || undefined,
          },
        },
      );
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['interventions', 'assignments', vars.assignmentId] });
      qc.invalidateQueries({ queryKey: ['interventions', 'assignments'] });
      qc.invalidateQueries({ queryKey: ['consent'] });
    },
  });
}

/** İK tarafı — 72h bekleyen consent için hatırlatıcı yeniden e-posta tetikle. */
export function useRemindConsent() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation<{ status: string }, ApiError | Error, { assignmentId: string }>({
    mutationFn: async (vars) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ status: string }>(
        `/api/v1/interventions/assignments/${vars.assignmentId}/remind`,
        { method: 'POST', token },
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['interventions', 'assignments', vars.assignmentId] });
    },
  });
}

/** İK tarafı — bir assignment üzerindeki tüm consent tarihçesi (drawer). */
export function useAssignmentConsentHistory(assignmentId: string | null | undefined) {
  const { getToken } = useAuth();
  return useQuery<{ items: ConsentLog[] }, Error>({
    queryKey: ['consent', 'assignment', assignmentId],
    enabled: !!assignmentId,
    staleTime: 30_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<{ items: ConsentLog[] }>(
        `/api/v1/interventions/assignments/${assignmentId}/consent/history`,
        { method: 'GET', token },
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assignment durumundan çalışan-yüzlü Türkçe etiket ve renk sınıfı. */
export function statusMeta(status: AssignmentStatus): {
  label: string;
  tone: 'amber' | 'green' | 'red' | 'gray' | 'accent';
} {
  switch (status) {
    case 'assigned':
      return { label: 'Onay bekliyor', tone: 'amber' };
    case 'in_progress':
      return { label: 'Devam ediyor', tone: 'accent' };
    case 'completed':
      return { label: 'Tamamlandı', tone: 'green' };
    case 'declined':
      return { label: 'Reddedildi', tone: 'red' };
    case 'cancelled':
      return { label: 'İptal edildi', tone: 'gray' };
    case 'lapsed':
      return { label: 'Süresi geçti', tone: 'gray' };
  }
}

/** Atama tarihinden bu yana saat farkı — 72h eşiği reminder için. */
export function hoursSinceAssigned(assignedAt: string): number {
  const diff = Date.now() - new Date(assignedAt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
}
