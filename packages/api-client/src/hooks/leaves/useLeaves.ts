/**
 * Leave request query hooks.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import { buildSearchParams } from '../../client/fetcher';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string;
  approverId: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  documentUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface LeaveBalance {
  employeeId: string;
  leaveTypeId: string;
  type: string;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  carriedOver: number;
  remaining: number;
  updatedAt: string;
}

interface LeaveListQuery {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  status?: string;
  type?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

/**
 * Fetches leave requests with optional filters.
 */
export const useLeaveRequests = (query: LeaveListQuery = {}) => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<LeaveRequest>, UpcoreApiError>({
    queryKey: queryKeys.leaves.list(query),
    queryFn: async () => {
      const params = buildSearchParams(query as Record<string, string | number | boolean | undefined>);
      return api.get(`leaves${params}`).json<PaginatedResponse<LeaveRequest>>();
    },
  });
};

/**
 * Fetches leave balance for a specific employee.
 */
export const useLeaveBalance = (employeeId: string) => {
  const api = useApiClient();

  return useQuery<LeaveBalance[], UpcoreApiError>({
    queryKey: queryKeys.leaves.balance(employeeId),
    queryFn: async () => {
      return api.get(`leaves/balance/${employeeId}`).json<LeaveBalance[]>();
    },
    enabled: !!employeeId,
  });
};

/**
 * Fetches leave requests for the current user.
 */
export const useMyLeaves = () => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<LeaveRequest>, UpcoreApiError>({
    queryKey: queryKeys.leaves.my(),
    queryFn: async () => {
      return api.get('leaves/my').json<PaginatedResponse<LeaveRequest>>();
    },
  });
};
