/**
 * Admin → notification service proxy: Slack install status.
 */
import { proxyToNotification } from '@/lib/notification-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyToNotification({
    method: 'GET',
    upstreamPath: '/api/v1/integrations/slack/status',
  });
}
