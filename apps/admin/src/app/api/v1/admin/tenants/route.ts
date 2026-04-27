/**
 * Admin → tenant service proxy. Forwards paginated/filter list of tenants.
 * Runs in Node.js runtime (Clerk auth requires it). No caching.
 */
import type { NextRequest } from 'next/server';
import { proxyToTenant } from '@/lib/tenant-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return proxyToTenant({
    method: 'GET',
    upstreamPath: '/admin/tenants',
    query: req.nextUrl.searchParams.toString(),
  });
}
