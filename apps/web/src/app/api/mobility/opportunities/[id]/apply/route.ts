import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

const MOBILITY = process.env['MOBILITY_SERVICE_URL'] || 'http://localhost:8013';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = getRequestContext(req);
  const body = await req.text();
  try {
    const r = await fetch(
      `${SERVICES.gateway ?? MOBILITY}/api/v1/mobility/marketplace/opportunities/${id}/apply`,
      { method: 'POST', headers: buildServiceHeaders(ctx), body },
    );
    const resBody = await r.json().catch(() => ({}));
    return NextResponse.json(resBody, { status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'service_unreachable', detail: String(err) },
      { status: 502 },
    );
  }
}
