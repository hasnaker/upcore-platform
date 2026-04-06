/**
 * Assessment catalog and user assignment hooks.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface Assessment {
  id: string;
  tenantId: string;
  instrumentId: string;
  name: string;
  type: string;
  description: string;
  estimatedMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AssessmentSession {
  id: string;
  assessmentId: string;
  employeeId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  answers: Record<string, number>;
  createdAt: string;
}

/**
 * Fetches all available assessments.
 */
export const useAssessments = () => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<Assessment>, UpcoreApiError>({
    queryKey: queryKeys.assessments.list(),
    queryFn: async () => {
      return api.get('assessments').json<PaginatedResponse<Assessment>>();
    },
  });
};

/**
 * Fetches a single assessment by ID.
 */
export const useAssessment = (id: string) => {
  const api = useApiClient();

  return useQuery<Assessment, UpcoreApiError>({
    queryKey: queryKeys.assessments.detail(id),
    queryFn: async () => {
      return api.get(`assessments/${id}`).json<Assessment>();
    },
    enabled: !!id,
  });
};

/**
 * Fetches assessments assigned to the current user.
 */
export const useMyAssessments = () => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<AssessmentSession>, UpcoreApiError>({
    queryKey: queryKeys.assessments.my(),
    queryFn: async () => {
      return api.get('assessments/my').json<PaginatedResponse<AssessmentSession>>();
    },
  });
};
