import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// GET /api/offers — list offers via employee service.
export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  const url = new URL(req.url);
  const qs = new URLSearchParams();
  for (const k of ['page', 'limit', 'status']) {
    const v = url.searchParams.get(k);
    if (v) qs.set(k, v);
  }

  try {
    const r = await fetch(`${SERVICES.employee}/api/v1/offers?${qs.toString()}`, {
      headers: buildServiceHeaders(ctx),
      cache: 'no-store',
    });
    const body = await r.json().catch(() => ({}));
    return NextResponse.json(body, { status: r.status });
  } catch (err) {
    return NextResponse.json({ error: 'service_unreachable', detail: String(err) }, { status: 502 });
  }
}
