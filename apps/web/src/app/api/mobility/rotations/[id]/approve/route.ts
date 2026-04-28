import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

const APPROVER_ROLES = new Set([
  'manager',
  'team_lead',
  'hr',
  'hr_admin',
  'hr_director',
  'admin',
  'owner',
]);

// POST /api/mobility/rotations/{id}/approve
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getRequestContext(req);
  if (!APPROVER_ROLES.has(ctx.userRole.toLowerCase())) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Onaylama yetkiniz yok.' } },
      { status: 403 },
    );
  }
  const upstream = SERVICES.gateway ?? SERVICES.mobility;
  try {
    const r = await fetch(
      `${upstream}/api/v1/mobility/rotations/${id}/approve`,
      { method: 'POST', headers: buildServiceHeaders(ctx) },
    );
    const body = await r.json().catch(() => ({}));
    return NextResponse.json(body, { status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'service_unreachable', message: String(err) } },
      { status: 502 },
    );
  }
}
