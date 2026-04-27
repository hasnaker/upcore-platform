import { proxyToStatus } from '@/lib/status-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.text();
  return proxyToStatus({
    method: 'POST',
    upstreamPath: `/api/v1/admin/status/incidents/${id}/resolve`,
    body,
  });
}
