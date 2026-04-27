/**
 * Admin → billing service: summary (MRR/ARR/plan dist/trend).
 */
import { proxyToBilling } from '@/lib/billing-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyToBilling({
    method: 'GET',
    upstreamPath: '/api/v1/admin/billing/summary',
  });
}
