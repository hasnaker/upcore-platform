/**
 * Server-side proxy helper for the admin panel → status service.
 *
 * Reuses the same Clerk platform-admin authorization as billing-proxy.
 * Forwards requests to the status service with the admin role header the
 * status service admin middleware expects.
 */
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const STATUS_SERVICE_URL =
  process.env['STATUS_SERVICE_URL'] ??
  process.env['NEXT_PUBLIC_STATUS_SERVICE_URL'] ??
  'http://localhost:8030';

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
  /** Upstream path on the status service (starting with '/'). */
  upstreamPath: string;
  body?: string | null;
  query?: string;
}

async function assertPlatformAdmin(): Promise<NextResponse | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json(
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
    return NextResponse.json(
      { error: 'forbidden', message: 'Bu işlem için platform-admin yetkisi gereklidir.' },
      { status: 403 },
    );
  }
  return null;
}

export async function proxyToStatus(options: ProxyOptions): Promise<NextResponse> {
  const guard = await assertPlatformAdmin();
  if (guard) return guard;

  const { getToken, userId } = await auth();
  const token = await getToken().catch(() => null);
  const user = await currentUser();
  const role =
    (user?.publicMetadata as { role?: string } | undefined)?.role ?? 'platform_admin';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  const url = new URL(options.upstreamPath, STATUS_SERVICE_URL);
  if (options.query) url.search = options.query;

  const headers: Record<string, string> = {
    'X-User-Id': userId ?? '',
    'X-User-Email': email,
    'X-User-Roles': role,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
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
    return NextResponse.json(
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
