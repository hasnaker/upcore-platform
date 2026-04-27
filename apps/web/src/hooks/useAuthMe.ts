'use client';

import { useApiQuery } from './useApi';
import type { AuthMe } from '@/lib/auth';

/**
 * Kimliği doğrulanmış kullanıcının profilini backend'den (`/api/v1/auth/me`)
 * çeker. Dönüş snake_case çünkü Go auth servisinin direkt çıktısı.
 * Gateway'in RequireTenant middleware'ı 403 döndürürse Clerk JWT
 * template'i ("upcore") eksik ya da organization seçili değil demektir.
 */
export function useAuthMe() {
  const query = useApiQuery<AuthMe>(['auth', 'me'], '/api/v1/auth/me', {
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if (error.message.toLowerCase().includes('tenant')) return false;
      return failureCount < 2;
    },
  });

  const fullName = query.data
    ? `${query.data.first_name} ${query.data.last_name}`.trim()
    : '';

  return {
    ...query,
    fullName,
    firstName: query.data?.first_name ?? '',
    lastName: query.data?.last_name ?? '',
    email: query.data?.email ?? '',
    roles: query.data?.roles ?? [],
    tenantId: query.data?.tenant_id ?? null,
  };
}
