'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';

import { apiFetch } from '@/lib/api-client';
import { useTenant } from './useTenant';

// Matches services/audit/internal/domain/consent.go
export type ConsentType =
  | 'data_processing'
  | 'performance_evaluation'
  | 'burnout_monitoring'
  | 'analytics'
  | 'ai_recommendations';

export type ConsentStatus = 'granted' | 'declined' | 'revoked';

export interface ConsentCatalogEntry {
  type: ConsentType;
  version: number;
  title_tr: string;
  summary_tr: string;
  legal_basis: string;
  article: string;
  required: boolean;
  blocks_ai: boolean;
}

export interface DataConsent {
  id: string;
  tenant_id: string;
  user_id: string;
  consent_type: ConsentType;
  version: number;
  status: ConsentStatus;
  accepted_at: string | null;
  ip_addr: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConsentsOverview {
  catalog: ConsentCatalogEntry[];
  consents: DataConsent[];
  current_version: number;
}

export interface ConsentHistoryEntry {
  id: string;
  tenant_id: string;
  consent_id: string;
  user_id: string;
  consent_type: ConsentType;
  version: number;
  previous_status: ConsentStatus | null;
  new_status: ConsentStatus;
  change_reason:
    | 'user_action'
    | 'version_upgrade'
    | 'admin_override'
    | 'system_reset';
  ip_addr: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  changed_at: string;
}

export interface ConsentHistoryResponse {
  consent_type: ConsentType;
  entries: ConsentHistoryEntry[];
}

export interface UpsertConsentInput {
  consent_type: ConsentType;
  status: ConsentStatus;
  metadata?: Record<string, unknown>;
}

const BASE_PATH = '/api/v1/kvkk/consents';
const QUERY_KEY = ['kvkk', 'consents'] as const;

export function useKvkkConsents() {
  const { getToken } = useAuth();
  const { tenant } = useTenant();

  return useQuery<ConsentsOverview, Error>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<ConsentsOverview>(BASE_PATH, {
        method: 'GET',
        token,
        tenantSlug: tenant?.slug ?? null,
      });
    },
    staleTime: 30_000,
  });
}

export function useKvkkConsentHistory(consentType: ConsentType | null) {
  const { getToken } = useAuth();
  const { tenant } = useTenant();

  return useQuery<ConsentHistoryResponse, Error>({
    queryKey: ['kvkk', 'consents', 'history', consentType],
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<ConsentHistoryResponse>(
        `${BASE_PATH}/history/${consentType}`,
        {
          method: 'GET',
          token,
          tenantSlug: tenant?.slug ?? null,
        },
      );
    },
    enabled: consentType !== null,
  });
}

/**
 * Upsert a consent decision. Optimistically updates the overview cache and
 * reverts on error. The backend automatically records IP + user-agent from
 * the request headers.
 */
export function useUpsertKvkkConsent() {
  const { getToken } = useAuth();
  const { tenant } = useTenant();
  const qc = useQueryClient();

  return useMutation<DataConsent, Error, UpsertConsentInput, { previous?: ConsentsOverview }>({
    mutationFn: async (input) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<DataConsent>(BASE_PATH, {
        method: 'POST',
        token,
        tenantSlug: tenant?.slug ?? null,
        body: input,
      });
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<ConsentsOverview>(QUERY_KEY);

      if (previous) {
        // Predict the resulting status: granted → declined transitions to
        // revoked only when a prior granted row exists (matches backend rule).
        const prior = previous.consents.find((c) => c.consent_type === input.consent_type);
        let nextStatus: ConsentStatus = input.status;
        if (
          input.status === 'declined' &&
          prior &&
          prior.status === 'granted'
        ) {
          nextStatus = 'revoked';
        }

        const nowIso = new Date().toISOString();
        const optimistic: DataConsent = prior
          ? {
              ...prior,
              status: nextStatus,
              updated_at: nowIso,
              accepted_at:
                nextStatus === 'granted' ? nowIso : prior.accepted_at,
            }
          : {
              id: `optimistic-${input.consent_type}`,
              tenant_id: '',
              user_id: '',
              consent_type: input.consent_type,
              version: previous.current_version,
              status: nextStatus,
              accepted_at: nextStatus === 'granted' ? nowIso : null,
              ip_addr: null,
              user_agent: null,
              metadata: input.metadata ?? {},
              created_at: nowIso,
              updated_at: nowIso,
            };

        const nextConsents = prior
          ? previous.consents.map((c) =>
              c.consent_type === input.consent_type ? optimistic : c,
            )
          : [...previous.consents, optimistic];

        qc.setQueryData<ConsentsOverview>(QUERY_KEY, {
          ...previous,
          consents: nextConsents,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(QUERY_KEY, ctx.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['kvkk', 'consents', 'history', vars.consent_type] });
    },
  });
}
