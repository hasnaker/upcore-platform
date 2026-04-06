/**
 * Action item hooks — list, approve, reject.
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import { buildSearchParams } from '../../client/fetcher';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface ActionItem {
  id: string;
  tenantId: string;
  assignedToUserId: string;
  kind: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  dueDate: string | null;
  referenceId: string | null;
  referenceType: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ActionsListQuery {
  page?: number;
  pageSize?: number;
  assignedToUserId?: string;
  status?: string;
  priority?: string;
  kind?: string;
}

/**
 * Fetches action items with filters.
 */
export const useActions = (query: ActionsListQuery = {}) => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<ActionItem>, UpcoreApiError>({
    queryKey: queryKeys.actions.list(query),
    queryFn: async () => {
      const params = buildSearchParams(query as Record<string, string | number | boolean | undefined>);
      return api.get(`actions${params}`).json<PaginatedResponse<ActionItem>>();
    },
  });
};

/**
 * Approves an action item. Optimistically updates status.
 */
export const useApproveAction = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    ActionItem,
    UpcoreApiError,
    { id: string; notes?: string }
  >({
    mutationFn: async ({ id, notes }) => {
      return api
        .post(`actions/${id}/approve`, { json: { notes: notes ?? '' } })
        .json<ActionItem>();
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.actions.detail(id),
      });

      const previous = queryClient.getQueryData<ActionItem>(
        queryKeys.actions.detail(id),
      );

      if (previous) {
        queryClient.setQueryData(queryKeys.actions.detail(id), {
          ...previous,
          status: 'APPROVED',
        });
      }

      return { previous };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.actions.detail(id), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actions.all() });
    },
  });
};

/**
 * Rejects an action item.
 */
export const useRejectAction = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    ActionItem,
    UpcoreApiError,
    { id: string; reason: string }
  >({
    mutationFn: async ({ id, reason }) => {
      return api
        .post(`actions/${id}/reject`, { json: { reason } })
        .json<ActionItem>();
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.actions.detail(id),
      });

      const previous = queryClient.getQueryData<ActionItem>(
        queryKeys.actions.detail(id),
      );

      if (previous) {
        queryClient.setQueryData(queryKeys.actions.detail(id), {
          ...previous,
          status: 'REJECTED',
        });
      }

      return { previous };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.actions.detail(id), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actions.all() });
    },
  });
};
