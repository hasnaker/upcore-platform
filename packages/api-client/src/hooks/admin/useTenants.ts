/**
 * Admin tenant management hooks (super-admin only).
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  seatCount: number;
  locale: string;
  timezone: string;
  enabledModules: string[];
  logoUrl: string | null;
  primaryDomain: string | null;
  contactEmail: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface CreateTenantRequest {
  name: string;
  slug: string;
  planTier: string;
  seatCount: number;
  contactEmail?: string;
}

export const useTenantsAdmin = (query: Record<string, unknown> = {}) => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<Tenant>, UpcoreApiError>({
    queryKey: queryKeys.admin.tenants(query),
    queryFn: async () => {
      return api.get('admin/tenants').json<PaginatedResponse<Tenant>>();
    },
  });
};

export const useTenant = (id: string) => {
  const api = useApiClient();

  return useQuery<Tenant, UpcoreApiError>({
    queryKey: queryKeys.admin.tenant(id),
    queryFn: async () => {
      return api.get(`admin/tenants/${id}`).json<Tenant>();
    },
    enabled: !!id,
  });
};

export const useCreateTenant = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Tenant, UpcoreApiError, CreateTenantRequest>({
    mutationFn: async (data) => {
      return api.post('admin/tenants', { json: data }).json<Tenant>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.tenants() });
    },
  });
};

export const useSuspendTenant = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Tenant, UpcoreApiError, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      return api
        .post(`admin/tenants/${id}/suspend`, { json: { reason } })
        .json<Tenant>();
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.tenant(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.tenants(),
      });
    },
  });
};
