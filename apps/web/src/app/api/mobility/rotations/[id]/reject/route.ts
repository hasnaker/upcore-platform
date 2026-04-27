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

// POST /api/mobility/rotations/{id}/reject — body: { reason: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = getRequestContext(req);
  if (!APPROVER_ROLES.has(ctx.userRole.toLowerCase())) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Reddetme yetkiniz yok.' } },
      { status: 403 },
    );
  }
  const raw = await req.text();
  let parsed: { reason?: string } = {};
  if (raw) {
    try {
      parsed = JSON.parse(raw) as { reason?: string };
    } catch {
      return NextResponse.json(
        { error: { code: 'invalid_body', message: 'JSON ayrıştırılamadı.' } },
        { status: 400 },
      );
    }
  }
  const reason = (parsed.reason ?? '').trim();
  if (reason.length < 10) {
    return NextResponse.json(
      { error: { code: 'validation_failed', message: 'Red gerekçesi en az 10 karakter olmalı.' } },
      { status: 400 },
    );
  }

  const upstream = SERVICES.gateway ?? SERVICES.mobility;
  try {
    const r = await fetch(
      `${upstream}/api/v1/mobility/rotations/${id}/reject`,
      {
        method: 'POST',
        headers: buildServiceHeaders(ctx),
        body: JSON.stringify({ reason }),
      },
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
