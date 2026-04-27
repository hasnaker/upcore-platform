// API helpers — all go through the Next.js proxy under /api/v1/admin/...
// The proxy verifies Clerk + platform-admin role and forwards with JWT.

import type {
  AdminTenantListResponse,
  StatusFilter,
  TenantStatus,
} from './types';

export async function fetchTenants(params: {
  page: number;
  pageSize: number;
  status: StatusFilter;
  search: string;
}): Promise<AdminTenantListResponse> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('page_size', String(params.pageSize));
  if (params.status !== 'all') qs.set('status', params.status);
  if (params.search.trim()) qs.set('q', params.search.trim());
  const r = await fetch(`/api/v1/admin/tenants?${qs.toString()}`, {
    cache: 'no-store',
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `HTTP ${r.status}`);
  }
  return r.json();
}

export async function changeTenantStatus(args: {
  id: string;
  status: Exclude<TenantStatus, 'deleted'>;
  reason: string;
}): Promise<void> {
  const r = await fetch(`/api/v1/admin/tenants/${args.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: args.status, reason: args.reason }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `HTTP ${r.status}`);
  }
}

export async function startImpersonation(args: {
  tenantId: string;
  reason: string;
}): Promise<{ session_id: string }> {
  // target_user_id is required by the endpoint. Platform admin impersonates
  // the tenant scope (no specific user) so we pass the zero-UUID which the
  // gateway will resolve to the tenant's first active owner/admin.
  const r = await fetch('/api/v1/admin/impersonation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_tenant_id: args.tenantId,
      target_user_id: '00000000-0000-0000-0000-000000000000',
      reason: args.reason,
    }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `HTTP ${r.status}`);
  }
  return r.json();
}
