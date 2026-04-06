/**
 * Department mutation hooks.
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface Department {
  id: string;
  [key: string]: unknown;
}

interface CreateDepartmentRequest {
  tenantId: string;
  name: string;
  code: string;
  parentId?: string | null;
  managerId?: string | null;
  description?: string;
  costCenter?: string | null;
  metadata?: Record<string, unknown>;
}

interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  parentId?: string | null;
  managerId?: string | null;
  description?: string;
  costCenter?: string | null;
}

export const useCreateDepartment = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Department, UpcoreApiError, CreateDepartmentRequest>({
    mutationFn: async (data) => {
      return api.post('departments', { json: data }).json<Department>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all() });
    },
  });
};

export const useUpdateDepartment = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    Department,
    UpcoreApiError,
    { id: string; data: UpdateDepartmentRequest }
  >({
    mutationFn: async ({ id, data }) => {
      return api.patch(`departments/${id}`, { json: data }).json<Department>();
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.departments.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.departments.all(),
      });
    },
  });
};

export const useDeleteDepartment = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, UpcoreApiError, string>({
    mutationFn: async (id) => {
      await api.delete(`departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all() });
    },
  });
};

/**
 * Moves a department to a new parent (reorganization).
 */
export const useMoveDepartment = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    Department,
    UpcoreApiError,
    { id: string; newParentId: string | null }
  >({
    mutationFn: async ({ id, newParentId }) => {
      return api
        .patch(`departments/${id}/move`, { json: { parentId: newParentId } })
        .json<Department>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all() });
    },
  });
};
