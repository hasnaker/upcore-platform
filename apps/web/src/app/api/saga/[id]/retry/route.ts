import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getRequestContext(req);
  try {
    const r = await fetch(`${SERVICES.employee}/api/v1/saga/${id}/retry`, {
      method: 'POST',
      headers: buildServiceHeaders(ctx),
    });
    const body = await r.json().catch(() => ({}));
    return NextResponse.json(body, { status: r.status });
  } catch (err) {
    return NextResponse.json({ error: 'service_unreachable', detail: String(err) }, { status: 502 });
  }
}
