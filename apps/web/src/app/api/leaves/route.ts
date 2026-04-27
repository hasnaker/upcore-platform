import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';
import { createAuditLogger } from '@/lib/audit-logger';

// GET /api/leaves — list types + balance + requests
export async function GET(request: NextRequest) {
  try {
    const ctx = getRequestContext(request);
    const employeeId = request.headers.get('x-employee-id') || ctx.userId;
    const headers = buildServiceHeaders(ctx, { 'X-Employee-Id': employeeId });

    const [typesRes, balanceRes, requestsRes] = await Promise.all([
      fetch(`${SERVICES.leave}/api/v1/leaves/types`, { headers }),
      fetch(`${SERVICES.leave}/api/v1/leaves/balances/${employeeId}`, { headers }),
      fetch(`${SERVICES.leave}/api/v1/leaves/requests`, { headers }),
    ]);

    const types = typesRes.ok ? await typesRes.json() : { items: [] };
    const balance = balanceRes.ok ? await balanceRes.json() : { items: [] };
    const requests = requestsRes.ok ? await requestsRes.json() : { items: [] };

    return NextResponse.json({ types: types.items || [], balance: balance.items || [], requests: requests.items || [] });
  } catch {
    return NextResponse.json({ error: 'İzin verileri alınamadı', types: [], balance: [], requests: [] }, { status: 500 });
  }
}

// POST /api/leaves — submit leave request
export async function POST(request: Request) {
  try {
    const ctx = getRequestContext(request);
    const employeeId = request.headers.get('x-employee-id') || ctx.userId;
    const body = await request.json();
    const res = await fetch(`${SERVICES.leave}/api/v1/leaves/requests`, {
      method: 'POST',
      headers: buildServiceHeaders(ctx, { 'X-Employee-Id': employeeId }),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'İzin talebi gönderilemedi' }, { status: 500 });
  }
}

// PATCH /api/leaves — Approve or reject leave request
export async function PATCH(req: NextRequest) {
  try {
    const ctx = getRequestContext(req);
    const body = await req.json();
    const { requestId, action, managerNotes } = body as {
      requestId?: string;
      action?: 'approve' | 'reject';
      managerNotes?: string;
    };

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId ve action zorunludur' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: "Geçersiz aksiyon. Geçerli değerler: 'approve', 'reject'" },
        { status: 400 },
      );
    }

    const status = action === 'approve' ? 'approved' : 'rejected';

    const res = await fetch(`${SERVICES.leave}/api/v1/leave-requests/${requestId}`, {
      method: 'PATCH',
      headers: buildServiceHeaders(ctx),
      body: JSON.stringify({ status, notes: managerNotes || '' }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const audit = createAuditLogger(ctx.userId, ctx.userRole, ctx.tenantId);
    void audit.log('update', 'leave_request', requestId, {
      status: { old: 'pending', new: status },
    });

    return NextResponse.json({
      success: true,
      leaveRequest: data,
      message: action === 'approve' ? 'İzin talebi onaylandı' : 'İzin talebi reddedildi',
    });
  } catch (error) {
    console.error('Leaves PATCH error:', error);
    return NextResponse.json({ error: 'İzin talebi güncellenemedi' }, { status: 500 });
  }
}
