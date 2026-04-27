import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// PATCH /api/mobility/applications/{id}/status — HR action.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = getRequestContext(req);
  const body = await req.text();
  const upstream = SERVICES.gateway ?? SERVICES.mobility;
  try {
    const r = await fetch(
      `${upstream}/api/v1/mobility/marketplace/applications/${id}/status`,
      { method: 'PATCH', headers: buildServiceHeaders(ctx), body },
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
