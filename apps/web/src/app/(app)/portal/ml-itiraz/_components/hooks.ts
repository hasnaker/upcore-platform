// React Query hooks for the ML-itiraz page.
//
// - useMyPredictions: the subject's own prediction history (KVKK Madde 11).
// - useFileObjection: file an objection (KVKK Madde 22) on a prediction.

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type { ObjectionResponse, UserPrediction } from './types';

export function useMyPredictions(
  tenantId: string | null,
  userId: string | null,
) {
  const { getToken } = useAuth();
  return useQuery<UserPrediction[], Error>({
    queryKey: ['ml', 'predictions', 'me', tenantId, userId],
    enabled: Boolean(tenantId && userId),
    staleTime: 60_000,
    queryFn: async () => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<UserPrediction[]>(
        `/api/v1/burnout/audit/predictions/me?tenant_id=${tenantId}&user_id=${userId}&limit=20`,
        { method: 'GET', token },
      );
    },
  });
}

export function useFileObjection() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation<
    ObjectionResponse,
    Error,
    { predictionId: string; tenantId: string; userId: string; reason: string }
  >({
    mutationFn: async ({ predictionId, tenantId, userId, reason }) => {
      const token = await getToken({ template: 'upcore' });
      return apiFetch<ObjectionResponse>(
        `/api/v1/burnout/predictions/${predictionId}/object`,
        {
          method: 'POST',
          token,
          body: { tenant_id: tenantId, user_id: userId, reason },
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ml', 'predictions', 'me'] });
    },
  });
}
