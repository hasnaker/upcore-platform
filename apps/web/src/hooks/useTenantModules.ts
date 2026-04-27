'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

// Tenant servisinin GET /api/v1/tenants/me/modules yanıtı.
export interface ProductModule {
  id: string;
  name_tr: string;
  description_tr: string;
  category: 'kazanim' | 'surdurme' | 'gelistirme' | 'yerlestirme' | 'koruma';
  active: boolean;
  price_monthly_try?: number;
  features_tr: string[];
}

export interface TenantModulesResponse {
  plan_id: string;
  plan_tier: string;
  modules: ProductModule[];
  active_count: number;
}

/** Mevcut tenant'ın aboneliğindeki aktif modüller + UpCore kataloğu. */
export function useTenantModules() {
  const { getToken } = useAuth();

  return useQuery<TenantModulesResponse, Error>({
    queryKey: ['tenants', 'me', 'modules'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<TenantModulesResponse>('/api/v1/tenants/me/modules', {
        method: 'GET',
        token,
      });
    },
  });
}
