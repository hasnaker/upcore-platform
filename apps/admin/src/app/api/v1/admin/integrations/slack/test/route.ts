/**
 * Admin → notification service proxy: send a Slack test message.
 */
import { proxyToNotification } from '@/lib/notification-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return proxyToNotification({
    method: 'POST',
    upstreamPath: '/api/v1/integrations/slack/test',
  });
}
