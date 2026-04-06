/**
 * Position CRUD hooks.
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import { buildSearchParams } from '../../client/fetcher';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface Position {
  id: string;
  tenantId: string;
  title: string;
  code: string;
  departmentId: string | null;
  level: string;
  jobFamily: string;
  description: string;
  salaryBand: { min: number; max: number; currency: string } | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface CreatePositionRequest {
  tenantId: string;
  title: string;
  code: string;
  departmentId?: string | null;
  level: string;
  jobFamily: string;
  description?: string;
}

interface UpdatePositionRequest {
  title?: string;
  code?: string;
  departmentId?: string | null;
  level?: string;
  jobFamily?: string;
  description?: string;
  isActive?: boolean;
}

export const usePositions = (departmentId?: string) => {
  const api = useApiClient();
  const filters = departmentId ? { departmentId } : {};

  return useQuery<PaginatedResponse<Position>, UpcoreApiError>({
    queryKey: queryKeys.positions.list(filters),
    queryFn: async () => {
      const params = buildSearchParams(filters);
      return api.get(`positions${params}`).json<PaginatedResponse<Position>>();
    },
  });
};

export const usePosition = (id: string) => {
  const api = useApiClient();

  return useQuery<Position, UpcoreApiError>({
    queryKey: queryKeys.positions.detail(id),
    queryFn: async () => {
      return api.get(`positions/${id}`).json<Position>();
    },
    enabled: !!id,
  });
};

export const useCreatePosition = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Position, UpcoreApiError, CreatePositionRequest>({
    mutationFn: async (data) => {
      return api.post('positions', { json: data }).json<Position>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all() });
    },
  });
};

export const useUpdatePosition = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    Position,
    UpcoreApiError,
    { id: string; data: UpdatePositionRequest }
  >({
    mutationFn: async ({ id, data }) => {
      return api.patch(`positions/${id}`, { json: data }).json<Position>();
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.positions.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.positions.all(),
      });
    },
  });
};

export const useDeletePosition = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, UpcoreApiError, string>({
    mutationFn: async (id) => {
      await api.delete(`positions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.all() });
    },
  });
};
