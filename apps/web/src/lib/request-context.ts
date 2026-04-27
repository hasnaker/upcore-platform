import type { NextRequest } from 'next/server';
import { FALLBACK_TENANT_ID, FALLBACK_USER_ID, FALLBACK_USER_ROLE } from '@/lib/service-urls';

export type RequestContext = {
  tenantId: string;
  userId: string;
  userRole: string;
  requestId: string;
};

const isProduction = process.env['NODE_ENV'] === 'production';

const readHeader = (headers: Headers, key: string): string => headers.get(key)?.trim() || '';

/**
 * Resolve identity/tenant context from gateway headers.
 * In development, env fallbacks keep local iteration fast.
 */
export const getRequestContext = (request: Request | NextRequest): RequestContext => {
  const headers = request.headers;
  const tenantId = readHeader(headers, 'x-tenant-id') || FALLBACK_TENANT_ID;
  const userId = readHeader(headers, 'x-user-id') || FALLBACK_USER_ID;
  const userRole = readHeader(headers, 'x-user-role') || FALLBACK_USER_ROLE;
  const requestId = readHeader(headers, 'x-request-id') || crypto.randomUUID();

  if (isProduction && (!tenantId || !userId)) {
    throw new Error('missing required gateway headers: X-Tenant-Id and/or X-User-Id');
  }

  return { tenantId, userId, userRole, requestId };
};

export const buildServiceHeaders = (
  ctx: RequestContext,
  extra?: Record<string, string>,
): HeadersInit => ({
  'Content-Type': 'application/json',
  'X-Tenant-Id': ctx.tenantId,
  'X-User-Id': ctx.userId,
  'X-User-Role': ctx.userRole,
  'X-Request-Id': ctx.requestId,
  ...extra,
});
