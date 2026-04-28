import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

const MOBILITY = process.env['MOBILITY_SERVICE_URL'] || 'http://localhost:8013';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getRequestContext(req);
  try {
    const r = await fetch(
      `${SERVICES.gateway ?? MOBILITY}/api/v1/mobility/marketplace/opportunities/${id}`,
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
