/**
 * Admin → billing service: invoice list + manual invoice creation.
 */
import type { NextRequest } from 'next/server';
import { proxyToBilling } from '@/lib/billing-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return proxyToBilling({
    method: 'GET',
    upstreamPath: '/api/v1/admin/billing/invoices',
    query: req.nextUrl.searchParams.toString(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return proxyToBilling({
    method: 'POST',
    upstreamPath: '/api/v1/admin/billing/invoices',
    body,
  });
}
