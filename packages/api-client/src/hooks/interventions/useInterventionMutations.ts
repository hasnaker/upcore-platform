/**
 * Intervention mutation hooks with optimistic status updates.
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface Intervention {
  id: string;
  status: string;
  [key: string]: unknown;
}

interface CreateInterventionRequest {
  employeeId: string;
  category: string;
  title: string;
  description: string;
  priority: number;
  dueDate?: string;
  assignedToUserId?: string;
}

export const useCreateIntervention = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Intervention, UpcoreApiError, CreateInterventionRequest>({
    mutationFn: async (data) => {
      return api.post('interventions', { json: data }).json<Intervention>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interventions.all() });
    },
  });
};

/**
 * Updates intervention status with optimistic update.
 */
export const useUpdateInterventionStatus = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    Intervention,
    UpcoreApiError,
    { id: string; status: string; notes?: string },
    { previous: Intervention | undefined }
  >({
    mutationFn: async ({ id, status, notes }) => {
      return api
        .patch(`interventions/${id}/status`, { json: { status, notes } })
        .json<Intervention>();
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.interventions.detail(id),
      });

      const previous = queryClient.getQueryData<Intervention>(
        queryKeys.interventions.detail(id),
      );

      if (previous) {
        queryClient.setQueryData(queryKeys.interventions.detail(id), {
          ...previous,
          status,
        });
      }

      return { previous };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.interventions.detail(id),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interventions.all() });
    },
  });
};

/**
 * Records the outcome of a completed intervention.
 */
export const useRecordInterventionOutcome = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    Intervention,
    UpcoreApiError,
    { id: string; outcome: string; effectivenessScore: number }
  >({
    mutationFn: async ({ id, outcome, effectivenessScore }) => {
      return api
        .post(`interventions/${id}/outcome`, {
          json: { outcome, effectivenessScore },
        })
        .json<Intervention>();
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.interventions.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.interventions.all(),
      });
    },
  });
};
