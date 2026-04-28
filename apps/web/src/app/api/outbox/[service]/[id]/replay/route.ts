import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

type ServiceKey = 'bordro' | 'employee' | 'performance' | 'ats';

const BASE_PATH: Record<ServiceKey, string> = {
  bordro: '/api/v1/bordro/outbox',
  employee: '/api/v1/outbox',
  performance: '/api/v1/performance/outbox',
  ats: '/api/v1/ats/outbox',
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ service: string; id: string }> },
) {
  const { service, id } = await params;
  if (!(service in BASE_PATH)) {
    return NextResponse.json({ error: 'unknown_service' }, { status: 400 });
  }
  const svcKey = service as ServiceKey;
  const ctx = await getRequestContext(req);
  const target = `${SERVICES[svcKey]}${BASE_PATH[svcKey]}/${id}/replay`;

  try {
    const r = await fetch(target, {
      method: 'POST',
      headers: buildServiceHeaders(ctx),
    });
    const body = await r.json().catch(() => ({}));
    return NextResponse.json(body, { status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'service_unreachable', detail: String(err) },
      { status: 502 },
    );
  }
}
