/**
 * Admin tenant status change proxy (suspend / activate).
 */
import { proxyToTenant } from '@/lib/tenant-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.text();
  return proxyToTenant({
    method: 'PATCH',
    upstreamPath: `/admin/tenants/${encodeURIComponent(id)}/status`,
    body,
  });
}
