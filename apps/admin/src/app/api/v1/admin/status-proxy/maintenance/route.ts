import { proxyToStatus } from '@/lib/status-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyToStatus({
    method: 'GET',
    upstreamPath: '/api/v2/scheduled-maintenances',
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxyToStatus({
    method: 'POST',
    upstreamPath: '/api/v1/admin/status/maintenance',
    body,
  });
}
