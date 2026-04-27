import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// POST /api/offers/{id}/onboard — triggers onboarding saga via employee service.
// Body: {"employee_no":"EMP-001","template_name":"standard_v1","hire_date":"2026-05-01"}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = getRequestContext(req);
  const body = await req.text();
  try {
    const r = await fetch(`${SERVICES.employee}/api/v1/offers/${id}/onboard`, {
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
