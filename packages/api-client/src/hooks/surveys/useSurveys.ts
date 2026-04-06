/**
 * Survey / Pulse query hooks.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface PulseCycle {
  id: string;
  surveyId: string;
  weekOf: string;
  status: string;
  responseRate: number;
  totalResponses: number;
  createdAt: string;
  closedAt: string | null;
}

interface PulseResults {
  cycle: PulseCycle;
  survey: Record<string, unknown>;
  totalResponses: number;
  responseRate: number;
  averageScores: Record<string, number>;
  sentimentAverage: number | null;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    responses: number;
    averageScores: Record<string, number>;
  }>;
}

interface SurveyStats {
  totalCycles: number;
  averageResponseRate: number;
  trendData: Array<{ weekOf: string; responseRate: number; avgScore: number }>;
}

/**
 * Fetches pulse survey cycles.
 */
export const usePulseCycles = () => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<PulseCycle>, UpcoreApiError>({
    queryKey: queryKeys.surveys.cycles(),
    queryFn: async () => {
      return api.get('surveys/cycles').json<PaginatedResponse<PulseCycle>>();
    },
  });
};

/**
 * Fetches a single pulse cycle.
 */
export const usePulseCycle = (id: string) => {
  const api = useApiClient();

  return useQuery<PulseCycle, UpcoreApiError>({
    queryKey: queryKeys.surveys.cycle(id),
    queryFn: async () => {
      return api.get(`surveys/cycles/${id}`).json<PulseCycle>();
    },
    enabled: !!id,
  });
};

/**
 * Fetches results for a pulse cycle.
 */
export const usePulseResults = (cycleId: string) => {
  const api = useApiClient();

  return useQuery<PulseResults, UpcoreApiError>({
    queryKey: queryKeys.surveys.results(cycleId),
    queryFn: async () => {
      return api.get(`surveys/cycles/${cycleId}/results`).json<PulseResults>();
    },
    enabled: !!cycleId,
  });
};

/**
 * Fetches pending surveys for the current user.
 */
export const usePendingSurveys = () => {
  const api = useApiClient();

  return useQuery<Array<{ cycleId: string; surveyId: string; deadline: string }>, UpcoreApiError>({
    queryKey: queryKeys.surveys.pending(),
    queryFn: async () => {
      return api.get('surveys/pending').json();
    },
  });
};

/**
 * Fetches aggregate stats for a survey.
 */
export const useSurveyStats = (surveyId: string) => {
  const api = useApiClient();

  return useQuery<SurveyStats, UpcoreApiError>({
    queryKey: queryKeys.surveys.stats(surveyId),
    queryFn: async () => {
      return api.get(`surveys/${surveyId}/stats`).json<SurveyStats>();
    },
    enabled: !!surveyId,
  });
};
