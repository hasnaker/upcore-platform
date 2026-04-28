import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// GET /api/saga?kind=stats
// GET /api/saga?kind=list&status=failed&saga_name=onboarding_v1&page=0
export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? 'list';

  let target = '';
  if (kind === 'stats') {
    target = `${SERVICES.employee}/api/v1/saga/stats`;
  } else {
    const qs = new URLSearchParams();
    const pass = ['status', 'saga_name', 'page', 'limit'];
    for (const k of pass) {
      const v = url.searchParams.get(k);
      if (v) qs.set(k, v);
    }
    target = `${SERVICES.employee}/api/v1/saga?${qs.toString()}`;
  }

  try {
    const r = await fetch(target, { headers: buildServiceHeaders(ctx), cache: 'no-store' });
    const body = await r.json().catch(() => ({}));
    return NextResponse.json(body, { status: r.status });
  } catch (err) {
    return NextResponse.json({ error: 'service_unreachable', detail: String(err) }, { status: 502 });
  }
}
