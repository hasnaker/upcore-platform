/**
 * Signup mutation — creates a new tenant + admin user.
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  locale?: string;
  acceptedTerms: true;
  kvkkConsent: true;
}

interface SignupResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: Record<string, unknown>;
  tenant: Record<string, unknown> | null;
}

export const useSignup = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<SignupResponse, UpcoreApiError, SignupRequest>({
    mutationFn: async (data) => {
      return api.post('auth/signup', { json: data }).json<SignupResponse>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
};
