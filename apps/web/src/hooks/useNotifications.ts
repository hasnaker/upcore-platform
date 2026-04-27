'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery, useApiMutation } from './useApi';

/* ─── Types — services/notification/internal/domain ─── */

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface InAppNotification {
  id: string;
  tenant_id: string;
  user_id: string;
  title_tr: string;
  body_tr: string;
  category: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  read_at?: string | null;
  action_url?: string | null;
  action_label_tr?: string | null;
  created_at: string;
}

export interface NotificationMine {
  id: string;
  channel: 'email' | 'sms' | 'inapp';
  status: NotificationStatus;
  subject?: string | null;
  body_preview?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  inapp_enabled: boolean;
  categories: Record<string, boolean>; // per-category toggle
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  updated_at: string;
}

interface Listed<T> {
  items: T[];
  total?: number;
}

/* ─── In-app inbox ─── */

export function useInAppNotifications(limit = 50) {
  return useApiQuery<Listed<InAppNotification>>(
    ['notifications', 'inapp', limit],
    `/api/v1/notifications/inapp?limit=${limit}`,
  );
}

export function useUnreadCount() {
  return useApiQuery<{ count: number }>(
    ['notifications', 'inapp', 'unread-count'],
    '/api/v1/notifications/inapp/unread-count',
    { refetchInterval: 60_000 }, // poll every minute
  );
}

export function useMarkRead(id: string) {
  const qc = useQueryClient();
  return useApiMutation<{ ok: true }, Record<string, never>>(
    `/api/v1/notifications/inapp/${id}/read`,
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['notifications'] });
      },
    },
  );
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useApiMutation<{ updated: number }, Record<string, never>>(
    '/api/v1/notifications/inapp/read-all',
    {
      method: 'POST',
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['notifications'] });
      },
    },
  );
}

/* ─── My history (email + sms + inapp) ─── */

export function useMyNotifications(limit = 30) {
  return useApiQuery<Listed<NotificationMine>>(
    ['notifications', 'mine', limit],
    `/api/v1/notifications/mine?limit=${limit}`,
  );
}

/* ─── Preferences ─── */

export function useMyNotificationPreferences() {
  return useApiQuery<NotificationPreferences>(
    ['notifications', 'preferences', 'mine'],
    '/api/v1/notifications/preferences/mine',
  );
}

export function useUpdateMyPreferences() {
  const qc = useQueryClient();
  return useApiMutation<
    NotificationPreferences,
    Partial<Omit<NotificationPreferences, 'user_id' | 'updated_at'>>
  >('/api/v1/notifications/preferences/mine', {
    method: 'PUT',
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['notifications', 'preferences', 'mine'] }),
  });
}
