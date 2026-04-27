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

const pickService = (key: string): { url: string; base: string } | null => {
  if (!(key in BASE_PATH)) return null;
  const svcKey = key as ServiceKey;
  return { url: SERVICES[svcKey], base: BASE_PATH[svcKey] };
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  const svc = pickService(service);
  if (!svc) {
    return NextResponse.json({ error: 'unknown_service' }, { status: 400 });
  }

  const ctx = getRequestContext(req);
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? 'stats';
  const page = url.searchParams.get('page') ?? '0';
  const limit = url.searchParams.get('limit') ?? '50';

  const target =
    kind === 'dlq'
      ? `${svc.url}${svc.base}/dlq?page=${page}&limit=${limit}`
      : `${svc.url}${svc.base}/stats`;

  try {
    const r = await fetch(target, { headers: buildServiceHeaders(ctx), cache: 'no-store' });
    const body = await r.json().catch(() => ({}));
    return NextResponse.json(body, { status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'service_unreachable', detail: String(err) },
      { status: 502 },
    );
  }
}
