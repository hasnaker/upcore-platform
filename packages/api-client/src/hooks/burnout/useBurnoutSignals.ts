/**
 * Burnout signal query hooks — time series, heatmap, trend.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import { buildSearchParams } from '../../client/fetcher';
import type { UpcoreApiError } from '../../client/error';

interface BurnoutSignal {
  id: string;
  employeeId: string;
  weekOf: string;
  level: string;
  score: number;
  factors: Record<string, number>;
  createdAt: string;
}

interface BurnoutHeatmapQuery {
  weekFrom: string;
  weekTo: string;
  departmentId?: string;
  minLevel?: string;
}

interface BurnoutHeatmapResponse {
  cells: Array<{
    employeeId: string;
    weekOf: string;
    level: string;
    score: number;
  }>;
  weeks: string[];
  departments: Array<{ id: string; name: string }>;
}

interface BurnoutTrendPoint {
  weekOf: string;
  averageScore: number;
  criticalCount: number;
  totalCount: number;
}

interface BurnoutEmployeeDetail {
  current: BurnoutSignal | null;
  trend: BurnoutTrendPoint[];
  history: BurnoutSignal[];
}

/**
 * Fetches burnout signals for an employee (time series).
 */
export const useBurnoutSignals = (employeeId: string) => {
  const api = useApiClient();

  return useQuery<BurnoutSignal[], UpcoreApiError>({
    queryKey: queryKeys.burnout.signals({ employeeId }),
    queryFn: async () => {
      return api.get(`burnout/signals/${employeeId}`).json<BurnoutSignal[]>();
    },
    enabled: !!employeeId,
  });
};

/**
 * Fetches the burnout heatmap (department grid).
 */
export const useBurnoutHeatmap = (query: BurnoutHeatmapQuery) => {
  const api = useApiClient();

  return useQuery<BurnoutHeatmapResponse, UpcoreApiError>({
    queryKey: queryKeys.burnout.heatmap(query),
    queryFn: async () => {
      const params = buildSearchParams(query);
      return api.get(`burnout/heatmap${params}`).json<BurnoutHeatmapResponse>();
    },
    enabled: !!query.weekFrom && !!query.weekTo,
  });
};

/**
 * Fetches burnout trend for a department over N weeks.
 */
export const useBurnoutTrend = (departmentId: string, weeks: number = 12) => {
  const api = useApiClient();

  return useQuery<BurnoutTrendPoint[], UpcoreApiError>({
    queryKey: queryKeys.burnout.trend(departmentId, weeks),
    queryFn: async () => {
      const params = buildSearchParams({ departmentId, weeks });
      return api.get(`burnout/trend${params}`).json<BurnoutTrendPoint[]>();
    },
    enabled: !!departmentId,
  });
};

/**
 * Fetches critical employees (high burnout risk).
 */
export const useCriticalEmployees = () => {
  const api = useApiClient();

  return useQuery<Array<{ employeeId: string; score: number; level: string }>, UpcoreApiError>({
    queryKey: queryKeys.burnout.signals({ critical: true }),
    queryFn: async () => {
      return api.get('burnout/critical').json();
    },
  });
};

/**
 * Fetches detailed burnout data for a single employee.
 */
export const useEmployeeBurnout = (employeeId: string) => {
  const api = useApiClient();

  return useQuery<BurnoutEmployeeDetail, UpcoreApiError>({
    queryKey: queryKeys.burnout.employeeDetail(employeeId),
    queryFn: async () => {
      return api.get(`burnout/employees/${employeeId}`).json<BurnoutEmployeeDetail>();
    },
    enabled: !!employeeId,
  });
};
