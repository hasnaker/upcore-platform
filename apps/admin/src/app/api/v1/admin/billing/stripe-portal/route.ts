/**
 * Admin → billing service: create Stripe Customer Portal session URL.
 */
import type { NextRequest } from 'next/server';
import { proxyToBilling } from '@/lib/billing-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  return proxyToBilling({
    method: 'POST',
    upstreamPath: '/api/v1/admin/billing/stripe-portal',
    body,
  });
}
