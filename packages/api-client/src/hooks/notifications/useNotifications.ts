/**
 * Notification hooks with polling for unread count.
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: { tr: string; en: string };
  body: { tr: string; en: string };
  link: string | null;
  channel: string;
  readAt: string | null;
  dismissedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface UnreadCount {
  count: number;
}

/**
 * Fetches paginated notifications.
 */
export const useNotifications = () => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<Notification>, UpcoreApiError>({
    queryKey: queryKeys.notifications.list(),
    queryFn: async () => {
      return api.get('notifications').json<PaginatedResponse<Notification>>();
    },
  });
};

/**
 * Fetches unread notification count.
 * Polls every 30 seconds.
 */
export const useUnreadCount = () => {
  const api = useApiClient();

  return useQuery<UnreadCount, UpcoreApiError>({
    queryKey: queryKeys.notifications.unread(),
    queryFn: async () => {
      return api.get('notifications/unread-count').json<UnreadCount>();
    },
    refetchInterval: 30_000, // Poll every 30 seconds
    refetchIntervalInBackground: false,
  });
};

/**
 * Marks a single notification as read.
 */
export const useMarkNotificationRead = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, UpcoreApiError, string>({
    mutationFn: async (notificationId) => {
      await api.patch(`notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(),
      });
    },
  });
};

/**
 * Marks all notifications as read.
 */
export const useMarkAllRead = () => {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, UpcoreApiError, void>({
    mutationFn: async () => {
      await api.post('notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(),
      });
    },
  });
};
