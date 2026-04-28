import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

/**
 * BFF route for burnout panel.
 * No direct DB access: aggregates data from burnout service contracts.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getRequestContext(request);
    const headers = buildServiceHeaders(ctx);
    const weeks = Number.parseInt(request.nextUrl.searchParams.get('weeks') || '4', 10);
    const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '10', 10);

    const [heatmapRes, criticalRes] = await Promise.all([
      fetch(`${SERVICES.burnout}/api/v1/burnout/heatmap?weeks=${Number.isNaN(weeks) ? 4 : weeks}`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${SERVICES.burnout}/api/v1/burnout/critical?limit=${Number.isNaN(limit) ? 10 : limit}`, {
        headers,
        cache: 'no-store',
      }),
    ]);

    const heatmapData = heatmapRes.ok ? await heatmapRes.json() : null;
    const criticalData = criticalRes.ok ? await criticalRes.json() : null;

    return NextResponse.json({
      heatmap: heatmapData?.cells || [],
      critical: criticalData?.items || [],
      jdr: [],
      stats: heatmapData?.stats || { avg_total: null, red_count: 0, total_employees: 0 },
    });
  } catch (error) {
    console.error('Burnout heatmap proxy error:', error);
    return NextResponse.json(
      { error: 'Burnout verileri alınamadı', details: String(error) },
      { status: 500 },
    );
  }
}
