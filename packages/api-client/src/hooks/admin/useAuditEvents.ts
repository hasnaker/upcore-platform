/**
 * Audit event monitoring hook (admin).
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../provider/ApiProvider';
import { queryKeys } from '../../keys/query-keys';
import { buildSearchParams } from '../../client/fetcher';
import type { UpcoreApiError } from '../../client/error';
import type { PaginatedResponse } from '../../client/types';

interface AuditEvent {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditEventsQuery {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}

export const useAuditEvents = (query: AuditEventsQuery = {}) => {
  const api = useApiClient();

  return useQuery<PaginatedResponse<AuditEvent>, UpcoreApiError>({
    queryKey: queryKeys.admin.auditEvents(query),
    queryFn: async () => {
      const params = buildSearchParams(query as Record<string, string | number | boolean | undefined>);
      return api.get(`admin/audit-events${params}`).json<PaginatedResponse<AuditEvent>>();
    },
  });
};
