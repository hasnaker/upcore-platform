import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// POST /api/mobility/rotations — employee proposes a rotation.
// Authz: any authenticated user may *propose* their own rotation. The backend
// re-checks tenant + cooldown; role-gated operations (approve/reject) live in
// sibling routes.
export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  const body = await req.text();
  const upstream = SERVICES.gateway ?? SERVICES.mobility;
  try {
    const r = await fetch(`${upstream}/api/v1/mobility/rotations`, {
      method: 'POST',
      headers: buildServiceHeaders(ctx),
      body,
    });
    const resBody = await r.json().catch(() => ({}));
    return NextResponse.json(resBody, { status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'service_unreachable', message: String(err) } },
      { status: 502 },
    );
  }
}
