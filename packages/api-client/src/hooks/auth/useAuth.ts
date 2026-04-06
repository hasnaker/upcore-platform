/**
 * Auth hooks — current user, current tenant, logout.
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
  employeeId: string | null;
  locale: string;
  avatarUrl: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  locale: string;
  timezone: string;
  logoUrl: string | null;
}

/**
 * Fetches the currently authenticated user.
 */
export const useCurrentUser = () => {
  const api = useApiClient();

  return useQuery<User, UpcoreApiError>({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      return api.get('auth/me').json<User>();
    },
    staleTime: 60_000, // 1 minute
  });
};

/**
 * Fetches the current tenant for the authenticated user.
 */
export const useCurrentTenant = () => {
  const api = useApiClient();

  return useQuery<Tenant, UpcoreApiError>({
    queryKey: queryKeys.auth.tenant(),
    queryFn: async () => {
      return api.get('auth/tenant').json<Tenant>();
    },
    staleTime: 60_000,
  });
};

/**
 * Logout mutation. Clears auth state and invalidates queries.
 */
export const useLogout = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, UpcoreApiError, void>({
    mutationFn: async () => {
      await api.post('auth/logout');
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
};
