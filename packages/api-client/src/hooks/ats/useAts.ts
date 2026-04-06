/**
 * ATS (Applicant Tracking System) hooks — positions, candidates, pipeline.
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import { buildSearchParams } from '../../client/fetcher';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface ATSPosition {
  id: string;
  title: string;
  departmentId: string | null;
  status: string;
  openDate: string;
  closeDate: string | null;
  applicantCount: number;
  createdAt: string;
}

interface Candidate {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  source: string;
  tags: string[];
  createdAt: string;
}

interface Application {
  id: string;
  candidateId: string;
  positionId: string;
  stage: string;
  overallRating: number | null;
  createdAt: string;
  updatedAt: string;
}

interface PipelineView {
  positionId: string;
  positionTitle: string;
  stages: Array<{
    stage: string;
    applications: Application[];
    count: number;
  }>;
}

/**
 * Fetches open ATS positions.
 */
export const usePositions = (filters?: Record<string, string | number | boolean | undefined>) => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<ATSPosition>, UpcoreApiError>({
    queryKey: queryKeys.ats.candidates(filters),
    queryFn: async () => {
      const params = filters ? buildSearchParams(filters) : '';
      return api.get(`ats/positions${params}`).json<PaginatedResponse<ATSPosition>>();
    },
  });
};

/**
 * Fetches candidates with optional filters.
 */
export const useCandidates = (filters?: Record<string, string | number | boolean | undefined>) => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<Candidate>, UpcoreApiError>({
    queryKey: queryKeys.ats.candidates(filters),
    queryFn: async () => {
      const params = filters ? buildSearchParams(filters) : '';
      return api.get(`ats/candidates${params}`).json<PaginatedResponse<Candidate>>();
    },
  });
};

/**
 * Fetches the application pipeline for a position (kanban view).
 */
export const useApplicationPipeline = (positionId?: string) => {
  const api = useApiClient();

  return useQuery<PipelineView, UpcoreApiError>({
    queryKey: queryKeys.ats.pipeline(positionId),
    queryFn: async () => {
      const params = positionId ? buildSearchParams({ positionId }) : '';
      return api.get(`ats/pipeline${params}`).json<PipelineView>();
    },
    enabled: !!positionId,
  });
};

/**
 * Moves a candidate to a new pipeline stage.
 */
export const useMoveCandidate = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    Application,
    UpcoreApiError,
    { applicationId: string; toStage: string; notes?: string }
  >({
    mutationFn: async ({ applicationId, toStage, notes }) => {
      return api
        .patch(`ats/applications/${applicationId}/stage`, {
          json: { stage: toStage, notes },
        })
        .json<Application>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ats.all() });
    },
  });
};
