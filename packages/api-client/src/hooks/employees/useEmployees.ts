/**
 * Employee list hooks — paginated, filterable, infinite scroll.
 */
'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import { buildSearchParams } from '../../client/fetcher';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface EmployeeListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  positionId?: string;
  employmentStatus?: string;
  contractType?: string;
  managerId?: string;
  hireDateFrom?: string;
  hireDateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

interface EmployeeListItem {
  id: string;
  tenantId: string;
  sicilNo: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
  positionId: string | null;
  managerId: string | null;
  employmentStatus: string;
  contractType: string;
  hireDate: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetches a paginated list of employees with optional filters.
 */
export const useEmployees = (query: EmployeeListQuery = {}) => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<EmployeeListItem>, UpcoreApiError>({
    queryKey: queryKeys.employees.list(query),
    queryFn: async () => {
      const params = buildSearchParams(query as Record<string, string | number | boolean | undefined>);
      return api.get(`employees${params}`).json<PaginatedResponse<EmployeeListItem>>();
    },
  });
};

/**
 * Infinite scroll variant for employee lists.
 */
export const useEmployeesInfinite = (filters: Omit<EmployeeListQuery, 'page'> = {}) => {
  const api = useApiClient();

  return useInfiniteQuery<PaginatedResponse<EmployeeListItem>, UpcoreApiError>({
    queryKey: queryKeys.employees.infinite(filters),
    queryFn: async ({ pageParam }) => {
      const params = buildSearchParams({
        ...filters,
        page: pageParam as number,
      } as Record<string, string | number | boolean | undefined>);
      return api.get(`employees${params}`).json<PaginatedResponse<EmployeeListItem>>();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
  });
};
