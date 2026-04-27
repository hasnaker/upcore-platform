/**
 * Admin → notification service proxy: begin Slack OAuth install.
 * Forwards a GET that returns a 302 to Slack's authorize URL.
 */
import type { NextRequest } from 'next/server';
import { proxyToNotification } from '@/lib/notification-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return proxyToNotification({
    method: 'GET',
    upstreamPath: '/api/v1/integrations/slack/install',
    query: req.nextUrl.searchParams.toString(),
    followRedirects: false,
  });
}
