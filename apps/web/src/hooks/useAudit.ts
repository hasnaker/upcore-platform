'use client';

import { useApiQuery } from './useApi';

/* ─── Types — services/audit/internal/domain ─── */

export interface AuditEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  actor_user_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
}

export interface AuditStats {
  period: string;
  total_events: number;
  by_severity: Record<string, number>;
  by_action: Array<{ action: string; count: number }>;
  by_actor: Array<{ actor_email: string; count: number }>;
}

interface Listed<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
}

/* ─── Events query ─── */

export function useAuditEvents(params: {
  event_type?: string;
  action?: string;
  resource_type?: string;
  actor_user_id?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  since?: string; // ISO
  until?: string;
  page?: number;
  limit?: number;
} = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  return useApiQuery<Listed<AuditEvent>>(
    ['audit', 'events', params],
    `/api/v1/audit/events${suffix}`,
  );
}

export function useAuditStats(period: '24h' | '7d' | '30d' = '7d') {
  return useApiQuery<AuditStats>(
    ['audit', 'stats', period],
    `/api/v1/audit/events/stats?period=${period}`,
  );
}

export function useResourceHistory(resourceType: string | null, resourceId: string | null) {
  const key = [resourceType, resourceId].join('/');
  return useApiQuery<Listed<AuditEvent>>(
    ['audit', 'resource', key],
    `/api/v1/audit/events/resource/${resourceType}/${resourceId}`,
    { enabled: Boolean(resourceType && resourceId) },
  );
}

export function useActorActivity(userId: string | null) {
  return useApiQuery<Listed<AuditEvent>>(
    ['audit', 'actor', userId ?? ''],
    `/api/v1/audit/events/actor/${userId}`,
    { enabled: Boolean(userId) },
  );
}
