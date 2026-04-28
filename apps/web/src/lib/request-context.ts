import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { FALLBACK_TENANT_ID, FALLBACK_USER_ID, FALLBACK_USER_ROLE } from '@/lib/service-urls';

export type RequestContext = {
  tenantId: string;
  userId: string;
  userRole: string;
  requestId: string;
  /**
   * Clerk-issued JWT (template "upcore") used to authenticate the request
   * against the gateway. Falls back to null when running in dev with the
   * fallback identity envs populated.
   */
  token: string | null;
};

const isProduction = process.env['NODE_ENV'] === 'production';

const readHeader = (headers: Headers, key: string): string => headers.get(key)?.trim() || '';

/**
 * Resolve identity/tenant context for a Next.js API route handler.
 *
 * Production architecture: the browser hits `/api/*` directly with Clerk
 * session cookies (no gateway in front of Next). We therefore need to:
 *   1. Trust gateway-injected headers (`X-Tenant-Id`, `X-User-Id`, ...)
 *      when the call originates from server-to-server through the gateway.
 *   2. Fall back to the Clerk session via `auth()` and the custom "upcore"
 *      JWT template, which carries `tenant_id` + `user_id` + `role` claims.
 *
 * Development: env vars (`DEV_TENANT_ID`, `DEV_USER_ID`, `DEV_USER_ROLE`)
 * keep local iteration friction-free.
 *
 * The returned `token` is forwarded to the gateway as
 * `Authorization: Bearer ...` by `buildServiceHeaders` so downstream
 * services receive the gateway-stamped X-Tenant-Id / X-User-Id headers.
 */
export const getRequestContext = async (
  request: Request | NextRequest,
): Promise<RequestContext> => {
  const headers = request.headers;
  let tenantId = readHeader(headers, 'x-tenant-id');
  let userId = readHeader(headers, 'x-user-id');
  let userRole = readHeader(headers, 'x-user-role');
  const requestId = readHeader(headers, 'x-request-id') || crypto.randomUUID();

  let token: string | null = null;

  if (!tenantId || !userId) {
    try {
      const session = await auth();
      if (session?.userId) {
        // Custom JWT template "upcore" — encodes tenant_id / user_id / role
        // claims so the gateway can mint internal headers without a tenant
        // slug roundtrip.
        token = await session.getToken({ template: 'upcore' });
        if (token) {
          const claims = decodeJwtClaims(token);
          if (!tenantId && typeof claims['tenant_id'] === 'string') {
            tenantId = claims['tenant_id'] as string;
          }
          if (!userId && typeof claims['user_id'] === 'string') {
            userId = claims['user_id'] as string;
          }
          if (!userRole && typeof claims['role'] === 'string') {
            userRole = claims['role'] as string;
          }
        }
      }
    } catch (err) {
      // Auth lookup may fail when route is invoked from server-side rendering
      // without a request context (e.g. during build). Swallow + fall through
      // to env fallbacks below.
      if (isProduction) {
        console.warn('[request-context] clerk auth() failed:', err);
      }
    }
  }

  tenantId = tenantId || FALLBACK_TENANT_ID;
  userId = userId || FALLBACK_USER_ID;
  userRole = userRole || FALLBACK_USER_ROLE;

  if (isProduction && (!tenantId || !userId)) {
    throw new Error(
      'missing required identity: gateway headers absent and Clerk session unavailable',
    );
  }

  return { tenantId, userId, userRole, requestId, token };
};

export const buildServiceHeaders = (
  ctx: RequestContext,
  extra?: Record<string, string>,
): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': ctx.tenantId,
    'X-User-Id': ctx.userId,
    'X-User-Role': ctx.userRole,
    'X-Request-Id': ctx.requestId,
    ...extra,
  };
  // Forward the Clerk JWT to the gateway. Gateway validates the token,
  // re-stamps X-User-Id/X-Tenant-Id from claims, and forwards downstream.
  // Without this, gateway routes with `auth_required: true` return 401.
  if (ctx.token) {
    headers['Authorization'] = `Bearer ${ctx.token}`;
  }
  return headers;
};

/**
 * Minimal JWT payload decoder. Does NOT verify signature — we only use it
 * to read tenant/user claims for header injection. Verification happens
 * at the gateway with the Clerk JWKS.
 */
function decodeJwtClaims(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  try {
    const payload = parts[1] ?? '';
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(normalized, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}
