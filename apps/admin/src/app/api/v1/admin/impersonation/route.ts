/**
 * Admin impersonation start proxy. Forwards to tenant service which
 * persists the session in app.admin_impersonation_sessions.
 */
import { proxyToTenant } from '@/lib/tenant-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  return proxyToTenant({
    method: 'POST',
    upstreamPath: '/admin/impersonation',
    body,
  });
}
