/**
 * Admin → notification service proxy: update Slack tenant-level settings.
 */
import type { NextRequest } from 'next/server';
import { proxyToNotification } from '@/lib/notification-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  const body = await req.text();
  return proxyToNotification({
    method: 'PATCH',
    upstreamPath: '/api/v1/integrations/slack/settings',
    body,
  });
}
