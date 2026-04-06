/**
 * Password reset hooks — forgot password + reset with token.
 */
'use client';

import { useMutation } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import type { UpcoreApiError } from '../../client/error';

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

/**
 * Sends a password reset email.
 */
export const useForgotPassword = () => {
  const api = useApiClient();

  return useMutation<void, UpcoreApiError, ForgotPasswordRequest>({
    mutationFn: async (data) => {
      await api.post('auth/forgot-password', { json: data });
    },
  });
};

/**
 * Resets a password using the token from email.
 */
export const useResetPassword = () => {
  const api = useApiClient();

  return useMutation<void, UpcoreApiError, ResetPasswordRequest>({
    mutationFn: async (data) => {
      await api.post('auth/reset-password', { json: data });
    },
  });
};
