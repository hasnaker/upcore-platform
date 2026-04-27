import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

const MOBILITY = process.env['MOBILITY_SERVICE_URL'] || 'http://localhost:8013';

// GET /api/mobility/opportunities?type=permanent
export async function GET(req: NextRequest) {
  const ctx = getRequestContext(req);
  const url = new URL(req.url);
  const qs = new URLSearchParams();
  if (url.searchParams.get('type')) qs.set('type', url.searchParams.get('type') ?? '');

  try {
    const r = await fetch(
      `${SERVICES.gateway ?? MOBILITY}/api/v1/mobility/marketplace/opportunities?${qs.toString()}`,
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

export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);
  const body = await req.text();
  try {
    const r = await fetch(
      `${SERVICES.gateway ?? MOBILITY}/api/v1/mobility/marketplace/opportunities`,
      { method: 'POST', headers: buildServiceHeaders(ctx), body },
    );
    const resBody = await r.json().catch(() => ({}));
    return NextResponse.json(resBody, { status: r.status });
  } catch (err) {
    return NextResponse.json({ error: 'service_unreachable', detail: String(err) }, { status: 502 });
  }
}
