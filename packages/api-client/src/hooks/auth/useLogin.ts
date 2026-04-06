/**
 * Login mutation hook.
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: Record<string, unknown>;
  tenant: Record<string, unknown> | null;
  requiresMfa: boolean;
}

/**
 * Login mutation. On success, invalidates the auth/me query
 * so the user profile is re-fetched.
 */
export const useLogin = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, UpcoreApiError, LoginRequest>({
    mutationFn: async (credentials) => {
      return api
        .post('auth/login', { json: credentials })
        .json<LoginResponse>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
};
