import { proxyToStatus } from '@/lib/status-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = url.searchParams.get('days') ?? '90';
  return proxyToStatus({
    method: 'GET',
    upstreamPath: '/api/v2/incidents',
    query: `days=${encodeURIComponent(days)}`,
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxyToStatus({
    method: 'POST',
    upstreamPath: '/api/v1/admin/status/incidents',
    body,
  });
}
