import { proxyToTenant } from '@/lib/tenant-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToTenant({
    method: 'POST',
    upstreamPath: `/admin/impersonation/${encodeURIComponent(id)}/end`,
  });
}
