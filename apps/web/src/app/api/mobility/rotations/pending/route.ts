import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

// GET /api/mobility/rotations/pending?role=current_manager|target_manager|hr
// Returns rotations awaiting the caller's approval. The Go service filters by
// status + scope (manager scope is derived from the caller's employee_id via
// the audit-enriched list endpoint).
const ALLOWED_ROLES_FOR = {
  current_manager: new Set(['manager', 'team_lead', 'hr', 'hr_admin', 'admin']),
  target_manager: new Set(['manager', 'team_lead', 'hr', 'hr_admin', 'admin']),
  hr: new Set(['hr', 'hr_admin', 'hr_director', 'admin', 'owner']),
} as const;

type PendingRole = keyof typeof ALLOWED_ROLES_FOR;

function isPendingRole(v: string | null): v is PendingRole {
  return v === 'current_manager' || v === 'target_manager' || v === 'hr';
}

export async function GET(req: NextRequest) {
  const ctx = getRequestContext(req);
  const url = new URL(req.url);
  const roleParam = url.searchParams.get('role');
  if (!isPendingRole(roleParam)) {
    return NextResponse.json(
      { error: { code: 'invalid_role', message: 'role parametresi geçersiz' } },
      { status: 400 },
    );
  }

  const caller = ctx.userRole.toLowerCase();
  if (!ALLOWED_ROLES_FOR[roleParam].has(caller)) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Bu listeyi görüntüleme yetkiniz yok.' } },
      { status: 403 },
    );
  }

  const upstream = SERVICES.gateway ?? SERVICES.mobility;
  try {
    const r = await fetch(
      `${upstream}/api/v1/mobility/rotations/pending?role=${roleParam}`,
      { headers: buildServiceHeaders(ctx), cache: 'no-store' },
    );
    // Fallback: older backends expose only the per-employee list. If the
    // pending endpoint 404s we surface an empty list instead of throwing so
    // the HR console degrades gracefully.
    if (r.status === 404) {
      return NextResponse.json({ rotations: [], total: 0 }, { status: 200 });
    }
    const body = await r.json().catch(() => ({ rotations: [], total: 0 }));
    return NextResponse.json(body, { status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'service_unreachable', message: String(err) }, rotations: [], total: 0 },
      { status: 502 },
    );
  }
}
