import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// GET /api/mobility/rotations/employee/{eid}
// Self-service view of an employee's rotation history. Backend RLS ensures
// tenant isolation; the Next layer additionally refuses cross-employee reads
// unless the caller has a management role.
const MANAGEMENT_ROLES = new Set([
  'admin',
  'hr',
  'hr_admin',
  'hr_director',
  'manager',
  'team_lead',
  'owner',
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eid: string }> },
) {
  const { eid } = await params;
  const ctx = getRequestContext(req);
  const role = ctx.userRole.toLowerCase();
  const isManager = MANAGEMENT_ROLES.has(role);
  const isSelf = ctx.userId && ctx.userId === eid;
  if (!isSelf && !isManager) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Yalnızca kendi rotasyon geçmişinizi görebilirsiniz.' } },
      { status: 403 },
    );
  }

  const upstream = SERVICES.gateway ?? SERVICES.mobility;
  try {
    const r = await fetch(
      `${upstream}/api/v1/mobility/employees/${eid}/rotations`,
      { headers: buildServiceHeaders(ctx), cache: 'no-store' },
    );
    const body = await r.json().catch(() => ({ rotations: [], total: 0 }));
    return NextResponse.json(body, { status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'service_unreachable', message: String(err) }, rotations: [], total: 0 },
      { status: 502 },
    );
  }
}
