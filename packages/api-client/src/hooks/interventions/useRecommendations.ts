/**
 * AI-powered intervention recommendations hook.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface Recommendation {
  category: string;
  title: string;
  description: string;
  confidence: number;
  expectedImpact: number;
  evidence: string[];
}

interface RecommendationsResponse {
  employeeId: string;
  recommendations: Recommendation[];
  modelVersion: string;
}

/**
 * Fetches AI-generated intervention recommendations for an employee.
 */
export const useInterventionRecommendations = (employeeId: string) => {
  const api = useApiClient();

  return useQuery<RecommendationsResponse, UpcoreApiError>({
    queryKey: queryKeys.interventions.recommendations(employeeId),
    queryFn: async () => {
      return api
        .get(`interventions/recommendations/${employeeId}`)
        .json<RecommendationsResponse>();
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // AI recommendations are expensive; cache 5 min
  });
};
