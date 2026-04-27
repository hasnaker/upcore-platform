/**
 * Admin → tenant service: feature flags list + upsert.
 * Backend: services/tenant AdminHandler ListFeatureFlags / UpsertFeatureFlag.
 */
import type { NextRequest } from 'next/server';
import { proxyToTenant } from '@/lib/tenant-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyToTenant({
    method: 'GET',
    upstreamPath: '/admin/feature-flags',
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.text();
  return proxyToTenant({
    method: 'PUT',
    upstreamPath: '/admin/feature-flags',
    body,
  });
}
