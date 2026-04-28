import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// POST /api/employees/{id}/offboard — triggers offboarding saga.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getRequestContext(req);
  const body = await req.text();
  try {
    const r = await fetch(`${SERVICES.employee}/api/v1/employees/${id}/offboard`, {
      method: 'POST',
      headers: buildServiceHeaders(ctx),
      body,
    });
    const resBody = await r.json().catch(() => ({}));
    return NextResponse.json(resBody, { status: r.status });
  } catch (err) {
    return NextResponse.json({ error: 'service_unreachable', detail: String(err) }, { status: 502 });
  }
}
