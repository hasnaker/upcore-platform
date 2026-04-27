import { proxyToStatus } from '@/lib/status-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyToStatus({ method: 'GET', upstreamPath: '/api/v2/components' });
}
