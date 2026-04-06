/**
 * Leave mutation hooks — request, approve, reject, cancel.
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';

interface LeaveRequest {
  id: string;
  [key: string]: unknown;
}

interface CreateLeaveRequest {
  leaveTypeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
  documentUrl?: string | null;
}

/**
 * Creates a new leave request.
 */
export const useCreateLeaveRequest = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<LeaveRequest, UpcoreApiError, CreateLeaveRequest>({
    mutationFn: async (data) => {
      return api.post('leaves', { json: data }).json<LeaveRequest>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });
    },
  });
};

/**
 * Approves a leave request. Optimistically updates the status.
 */
export const useApproveLeave = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<LeaveRequest, UpcoreApiError, { id: string; notes?: string }>({
    mutationFn: async ({ id, notes }) => {
      return api
        .post(`leaves/${id}/approve`, { json: { notes: notes ?? '' } })
        .json<LeaveRequest>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });
    },
  });
};

/**
 * Rejects a leave request.
 */
export const useRejectLeave = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<LeaveRequest, UpcoreApiError, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      return api
        .post(`leaves/${id}/reject`, { json: { reason } })
        .json<LeaveRequest>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });
    },
  });
};

/**
 * Cancels a pending leave request.
 */
export const useCancelLeave = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, UpcoreApiError, string>({
    mutationFn: async (id) => {
      await api.post(`leaves/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });
    },
  });
};
