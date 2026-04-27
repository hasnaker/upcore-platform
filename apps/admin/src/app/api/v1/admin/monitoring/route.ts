/**
 * Admin → status service: aggregated component health + 90-day history.
 * Backend: GET /api/v2/components?with_history=true
 * Returns: { components: [{ id, name, status, category, history: [{day,total_probes,failed_probes,p95_latency_ms,incident_count}] }] }
 */
import { proxyToStatus } from '@/lib/status-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyToStatus({
    method: 'GET',
    upstreamPath: '/api/v2/components?with_history=true',
  });
}
