/**
 * Admin tenant detail proxy.
 */
import { proxyToTenant } from '@/lib/tenant-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToTenant({
    method: 'GET',
    upstreamPath: `/admin/tenants/${encodeURIComponent(id)}`,
  });
}
