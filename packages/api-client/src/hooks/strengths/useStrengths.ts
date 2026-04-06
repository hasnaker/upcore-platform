/**
 * Strength profile hooks.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface StrengthProfile {
  employeeId: string;
  topStrengths: Array<{ id: string; name: string; score: number; rank: number }>;
  assessedAt: string;
}

interface TeamStrengths {
  departmentId: string;
  strengths: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  totalEmployees: number;
}

export const useStrengthProfile = (employeeId: string) => {
  const api = useApiClient();

  return useQuery<StrengthProfile, UpcoreApiError>({
    queryKey: queryKeys.strengths.profile(employeeId),
    queryFn: async () => {
      return api.get(`strengths/profile/${employeeId}`).json<StrengthProfile>();
    },
    enabled: !!employeeId,
  });
};

export const useTeamStrengths = (departmentId: string) => {
  const api = useApiClient();

  return useQuery<TeamStrengths, UpcoreApiError>({
    queryKey: queryKeys.strengths.team(departmentId),
    queryFn: async () => {
      return api.get(`strengths/team/${departmentId}`).json<TeamStrengths>();
    },
    enabled: !!departmentId,
  });
};
