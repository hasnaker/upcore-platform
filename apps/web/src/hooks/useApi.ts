'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { apiFetch, type ApiRequestOptions } from '@/lib/api-client';
import { useTenant } from './useTenant';

/**
 * Thin React Query wrapper that injects the current Clerk token +
 * active tenant slug into every API call.
 */
export function useApiQuery<TData>(
  key: readonly unknown[],
  path: string,
  options?: Omit<UseQueryOptions<TData, Error, TData>, 'queryKey' | 'queryFn'>,
) {
  const { getToken } = useAuth();
  const { tenant } = useTenant();

  return useQuery<TData, Error, TData>({
    queryKey: key,
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<TData>(path, {
        method: 'GET',
        token,
        tenantSlug: tenant?.slug ?? null,
      });
    },
    ...options,
  });
}

export function useApiMutation<TData, TVariables>(
  path: string | ((vars: TVariables) => string),
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> & {
    method?: ApiRequestOptions['method'];
  },
) {
  const { getToken } = useAuth();
  const { tenant } = useTenant();
  const { method = 'POST', ...mutationOptions } = options ?? {};

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const token = await getToken();
      const resolvedPath = typeof path === 'function' ? path(variables) : path;
      return apiFetch<TData>(resolvedPath, {
        method,
        body: variables,
        token,
        tenantSlug: tenant?.slug ?? null,
      });
    },
    ...mutationOptions,
  });
}
