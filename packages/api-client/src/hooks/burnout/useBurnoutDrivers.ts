/**
 * Burnout driver analysis hook.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface BurnoutDriver {
  factor: string;
  score: number;
  trend: 'improving' | 'stable' | 'worsening';
  contribution: number;
}

/**
 * Fetches top burnout drivers for an employee.
 */
export const useBurnoutDrivers = (employeeId: string) => {
  const api = useApiClient();

  return useQuery<BurnoutDriver[], UpcoreApiError>({
    queryKey: queryKeys.burnout.drivers(employeeId),
    queryFn: async () => {
      return api.get(`burnout/drivers/${employeeId}`).json<BurnoutDriver[]>();
    },
    enabled: !!employeeId,
  });
};
