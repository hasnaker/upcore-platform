/**
 * Server-side proxy helper for the admin panel → audit service.
 *
 * Mirrors the billing-proxy / tenant-proxy pattern:
 * - Verifies Clerk session + platform-admin role (defense in depth).
 * - Forwards the Clerk JWT + trusted X-User-Id/Roles/X-Tenant-ID headers.
 * - Runs only in Node.js runtime (Clerk auth requirement).
 */
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const AUDIT_SERVICE_URL =
  process.env['AUDIT_SERVICE_URL'] ??
  process.env['NEXT_PUBLIC_AUDIT_SERVICE_URL'] ??
  'http://localhost:8009';

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
  method: string;
  /** Upstream path on the audit service (must start with '/'). */
  upstreamPath: string;
  body?: string | null;
  query?: string;
}

export interface ProxyErrorResponse {
  error: string;
  message?: string;
}

async function assertPlatformAdmin(): Promise<NextResponse | null> {
  const { userId, sessionClaims } = await auth();
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
      { error: 'forbidden', message: 'Bu işlem için platform-admin yetkisi gereklidir.' },
      { status: 403 },
    );
  }
  return null;
}

export async function proxyToAudit(options: ProxyOptions): Promise<NextResponse> {
  const guard = await assertPlatformAdmin();
  if (guard) return guard;

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
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  const url = new URL(options.upstreamPath, AUDIT_SERVICE_URL);
  if (options.query) url.search = options.query;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'X-User-ID': userId ?? '',
    'X-User-Email': email,
    'X-User-Role': role,
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
