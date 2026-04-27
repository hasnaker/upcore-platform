import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// GET /api/mobility/opportunities/{id}/fit/{eid}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> },
) {
  const { id, eid } = await params;
  const ctx = getRequestContext(req);
  const upstream = SERVICES.gateway ?? SERVICES.mobility;
  try {
    const r = await fetch(
      `${upstream}/api/v1/mobility/marketplace/opportunities/${id}/fit/${eid}`,
      { headers: buildServiceHeaders(ctx), cache: 'no-store' },
    );
    const body = await r.json().catch(() => ({}));
    return NextResponse.json(body, { status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'service_unreachable', detail: String(err) },
      { status: 502 },
    );
  }
}
