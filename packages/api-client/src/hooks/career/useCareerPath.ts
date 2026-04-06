/**
 * Career path hooks.
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface CareerPath {
  employeeId: string;
  currentPosition: { id: string; title: string; level: string };
  suggestedPaths: Array<{
    targetPosition: { id: string; title: string; level: string };
    readiness: number;
    gaps: string[];
    estimatedTimeMonths: number;
  }>;
  generatedAt: string;
}

export const useCareerPath = (employeeId: string) => {
  const api = useApiClient();

  return useQuery<CareerPath, UpcoreApiError>({
    queryKey: queryKeys.career.path(employeeId),
    queryFn: async () => {
      return api.get(`career/path/${employeeId}`).json<CareerPath>();
    },
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000, // Career paths change slowly
  });
};

export const useGenerateCareerPath = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<CareerPath, UpcoreApiError, { employeeId: string }>({
    mutationFn: async ({ employeeId }) => {
      return api
        .post(`career/path/${employeeId}/generate`)
        .json<CareerPath>();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.career.path(data.employeeId),
        data,
      );
    },
  });
};
