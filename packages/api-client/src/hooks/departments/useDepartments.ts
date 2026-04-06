/**
 * Department list + tree hooks.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface Department {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  parentId: string | null;
  managerId: string | null;
  description: string;
  headcount: number;
  costCenter: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface DepartmentTree extends Department {
  children: DepartmentTree[];
}

/**
 * Fetches a flat list of departments.
 */
export const useDepartments = () => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<Department>, UpcoreApiError>({
    queryKey: queryKeys.departments.list(),
    queryFn: async () => {
      return api.get('departments').json<PaginatedResponse<Department>>();
    },
  });
};

/**
 * Fetches the department tree (hierarchical).
 */
export const useDepartmentTree = () => {
  const api = useApiClient();

  return useQuery<DepartmentTree[], UpcoreApiError>({
    queryKey: queryKeys.departments.tree(),
    queryFn: async () => {
      return api.get('departments/tree').json<DepartmentTree[]>();
    },
  });
};

/**
 * Fetches a single department by ID.
 */
export const useDepartment = (id: string) => {
  const api = useApiClient();

  return useQuery<Department, UpcoreApiError>({
    queryKey: queryKeys.departments.detail(id),
    queryFn: async () => {
      return api.get(`departments/${id}`).json<Department>();
    },
    enabled: !!id,
  });
};
