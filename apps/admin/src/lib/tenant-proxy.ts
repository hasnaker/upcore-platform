/**
 * Server-side proxy helper for the admin panel → tenant service.
 *
 * Runs inside Next.js route handlers. Verifies the caller is authenticated
 * with Clerk, ensures the principal carries a platform-admin role (defense
 * in depth on top of the middleware.ts guard), then forwards the request
 * to the upstream tenant service with the Clerk JWT + trusted headers.
 */
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const TENANT_SERVICE_URL =
  process.env['TENANT_SERVICE_URL'] ??
  process.env['NEXT_PUBLIC_TENANT_SERVICE_URL'] ??
  'http://localhost:8002';

const PLATFORM_ADMIN_ROLES = new Set([
  'platform-admin',
  'platform_admin',
  'upcore_staff',
  'upcore-staff',
  'admin',
  'org:platform-admin',
  'org:platform_admin',
]);

interface ClerkSessionClaims {
  role?: string;
  org_role?: string;
  [key: string]: unknown;
}

interface ProxyOptions {
  /** HTTP method forwarded upstream. */
  method: string;
  /** Upstream path, must start with '/'. */
  upstreamPath: string;
  /** Request body to forward (stringified JSON or null). */
  body?: string | null;
  /** Extra query string already formatted ('a=1&b=2'), no leading '?'. */
  query?: string;
}

export interface ProxyErrorResponse {
  error: string;
  message?: string;
}

async function assertPlatformAdmin(): Promise<NextResponse | null> {
  const { userId, sessionClaims, getToken } = await auth();
  if (!userId) {
    return NextResponse.json<ProxyErrorResponse>(
      { error: 'unauthorized', message: 'Clerk oturumu bulunamadı' },
      { status: 401 },
    );
  }
  const claims = (sessionClaims ?? {}) as ClerkSessionClaims;
  const role =
    (typeof claims.role === 'string' && claims.role) ||
    (typeof claims.org_role === 'string' && claims.org_role) ||
    '';
  const normalized = role.trim().toLowerCase();
  if (!PLATFORM_ADMIN_ROLES.has(normalized)) {
    return NextResponse.json<ProxyErrorResponse>(
      {
        error: 'forbidden',
        message: 'Bu işlem için platform-admin yetkisi gereklidir.',
      },
      { status: 403 },
    );
  }
  // Side-effect: prime the token so proxyToTenant can reuse via getToken.
  void getToken;
  return null;
}

/**
 * Proxy a request to the tenant service after verifying platform-admin role.
 * Returns a NextResponse ready to be returned from the route handler.
 */
export async function proxyToTenant(options: ProxyOptions): Promise<NextResponse> {
  const guard = await assertPlatformAdmin();
  if (guard) {
    return guard;
  }

  const { getToken, userId } = await auth();
  const token = await getToken().catch(() => null);
  if (!token) {
    return NextResponse.json<ProxyErrorResponse>(
      { error: 'unauthorized', message: 'Clerk token alınamadı' },
      { status: 401 },
    );
  }

  const user = await currentUser();
  const role =
    (user?.publicMetadata as { role?: string } | undefined)?.role ?? 'platform-admin';

  const url = new URL(options.upstreamPath, TENANT_SERVICE_URL);
  if (options.query) {
    url.search = options.query;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'X-User-ID': userId ?? '',
    'X-User-Role': role,
    // Platform admin uses the synthetic upcore tenant when no org context exists.
    'X-Tenant-ID':
      (user?.publicMetadata as { tenantId?: string } | undefined)?.tenantId ??
      '00000000-0000-0000-0000-000000000000',
  };
  if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ?? undefined,
      cache: 'no-store',
    });
  } catch (err) {
    return NextResponse.json<ProxyErrorResponse>(
      { error: 'upstream_unreachable', message: (err as Error).message },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  const contentType = upstream.headers.get('content-type') ?? 'application/json; charset=utf-8';
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': contentType },
  });
}
