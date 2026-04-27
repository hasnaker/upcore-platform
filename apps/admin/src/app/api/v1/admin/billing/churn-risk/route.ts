/**
 * Admin → billing service: churn risk list (feature-flag gated server-side).
 */
import type { NextRequest } from 'next/server';
import { proxyToBilling } from '@/lib/billing-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return proxyToBilling({
    method: 'GET',
    upstreamPath: '/api/v1/admin/billing/churn-risk',
    query: req.nextUrl.searchParams.toString(),
  });
}
