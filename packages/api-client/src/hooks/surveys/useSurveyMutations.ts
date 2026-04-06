/**
 * Survey mutation hooks — create cycle, close, submit response.
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface PulseCycle {
  id: string;
  [key: string]: unknown;
}

interface CreatePulseCycleRequest {
  surveyId: string;
  weekOf: string;
  schedule?: Record<string, unknown>;
  targetEmployeeIds?: string[];
}

interface SubmitPulseResponseRequest {
  cycleId: string;
  answers: Record<string, number>;
  freeText?: string;
}

export const useCreatePulseCycle = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<PulseCycle, UpcoreApiError, CreatePulseCycleRequest>({
    mutationFn: async (data) => {
      return api.post('surveys/cycles', { json: data }).json<PulseCycle>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all() });
    },
  });
};

export const useClosePulseCycle = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<PulseCycle, UpcoreApiError, string>({
    mutationFn: async (cycleId) => {
      return api
        .post(`surveys/cycles/${cycleId}/close`)
        .json<PulseCycle>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all() });
    },
  });
};

export const useSubmitPulseResponse = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, UpcoreApiError, SubmitPulseResponseRequest>({
    mutationFn: async (data) => {
      await api.post('surveys/responses', { json: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.pending() });
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all() });
    },
  });
};
