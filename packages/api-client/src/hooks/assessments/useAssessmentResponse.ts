/**
 * Assessment response hooks — start, save answers, submit.
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface AssessmentSession {
  id: string;
  assessmentId: string;
  employeeId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  answers: Record<string, number>;
}

interface StartAssessmentResponse {
  session: AssessmentSession;
  assessment: Record<string, unknown>;
}

interface AssessmentResults {
  sessionId: string;
  scores: Record<string, number>;
  summary: string;
  completedAt: string;
}

/**
 * Starts an assessment session.
 */
export const useStartAssessment = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    StartAssessmentResponse,
    UpcoreApiError,
    { assessmentId: string }
  >({
    mutationFn: async ({ assessmentId }) => {
      return api
        .post('assessments/start', { json: { assessmentId } })
        .json<StartAssessmentResponse>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.my() });
    },
  });
};

/**
 * Saves intermediate answers (autosave).
 */
export const useSaveAnswers = () => {
  const api = useApiClient();

  return useMutation<
    void,
    UpcoreApiError,
    { responseId: string; answers: Record<string, number> }
  >({
    mutationFn: async ({ responseId, answers }) => {
      await api.patch(`assessments/responses/${responseId}`, {
        json: { answers },
      });
    },
  });
};

/**
 * Submits a completed assessment.
 */
export const useSubmitAssessment = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    AssessmentSession,
    UpcoreApiError,
    { responseId: string }
  >({
    mutationFn: async ({ responseId }) => {
      return api
        .post(`assessments/responses/${responseId}/submit`)
        .json<AssessmentSession>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all() });
    },
  });
};

/**
 * Fetches assessment results for an employee by assessment type.
 */
export const useAssessmentResults = (employeeId: string, type: string) => {
  const api = useApiClient();

  return useQuery<AssessmentResults, UpcoreApiError>({
    queryKey: queryKeys.assessments.results(employeeId, type),
    queryFn: async () => {
      return api
        .get(`assessments/results/${employeeId}/${type}`)
        .json<AssessmentResults>();
    },
    enabled: !!employeeId && !!type,
  });
};
