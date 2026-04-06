/**
 * Intervention query hooks.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import { buildSearchParams } from '../../client/fetcher';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface Intervention {
  id: string;
  tenantId: string;
  employeeId: string;
  assignedToUserId: string;
  category: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  dueDate: string | null;
  completedAt: string | null;
  outcome: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface InterventionListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  assignedToUserId?: string;
  status?: string;
  category?: string;
  priorityMin?: number;
}

/**
 * Fetches interventions with filters.
 */
export const useInterventions = (query: InterventionListQuery = {}) => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<Intervention>, UpcoreApiError>({
    queryKey: queryKeys.interventions.list(query),
    queryFn: async () => {
      const params = buildSearchParams(query as Record<string, string | number | boolean | undefined>);
      return api.get(`interventions${params}`).json<PaginatedResponse<Intervention>>();
    },
  });
};

/**
 * Fetches a single intervention.
 */
export const useIntervention = (id: string) => {
  const api = useApiClient();

  return useQuery<Intervention, UpcoreApiError>({
    queryKey: queryKeys.interventions.detail(id),
    queryFn: async () => {
      return api.get(`interventions/${id}`).json<Intervention>();
    },
    enabled: !!id,
  });
};

/**
 * Fetches interventions assigned to the current user.
 */
export const useMyInterventions = () => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<Intervention>, UpcoreApiError>({
    queryKey: queryKeys.interventions.my(),
    queryFn: async () => {
      return api.get('interventions/my').json<PaginatedResponse<Intervention>>();
    },
  });
};
