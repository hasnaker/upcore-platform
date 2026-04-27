/**
 * Admin → notification service proxy: revoke Slack install.
 */
import { proxyToNotification } from '@/lib/notification-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE() {
  return proxyToNotification({
    method: 'DELETE',
    upstreamPath: '/api/v1/integrations/slack',
  });
}
