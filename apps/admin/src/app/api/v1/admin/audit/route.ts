/**
 * Admin → audit service: paginated/filterable event query.
 * Backend: services/audit EventHandler.Query → GET /api/v1/audit/events
 */
import type { NextRequest } from 'next/server';
import { proxyToAudit } from '@/lib/audit-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return proxyToAudit({
    method: 'GET',
    upstreamPath: '/api/v1/audit/events',
    query: req.nextUrl.searchParams.toString(),
  });
}
