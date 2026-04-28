import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// GET /api/mobility/employees/{eid}/applications
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eid: string }> },
) {
  const { eid } = await params;
  const ctx = await getRequestContext(req);
  const upstream = SERVICES.gateway ?? SERVICES.mobility;
  try {
    const r = await fetch(
      `${upstream}/api/v1/mobility/marketplace/employees/${eid}/applications`,
      { headers: buildServiceHeaders(ctx), cache: 'no-store' },
    );
    const body = await r.json().catch(() => ({ items: [] }));
    return NextResponse.json(body, { status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'service_unreachable', detail: String(err), items: [] },
      { status: 502 },
    );
  }
}
