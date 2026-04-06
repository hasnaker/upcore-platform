import { NextRequest, NextResponse } from 'next/server';
import { SERVICES, DEV_HEADERS } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

const HEADERS = {
  ...DEV_HEADERS,
  'X-Employee-Id': '64731864-b6eb-4af9-9448-00bb5d9ae74b',
};

// GET /api/leaves — list types + balance + requests
export async function GET() {
  try {
    const [typesRes, balanceRes, requestsRes] = await Promise.all([
      fetch(`${SERVICES.leave}/api/v1/leaves/types`, { headers: HEADERS }),
      fetch(`${SERVICES.leave}/api/v1/leaves/balances/64731864-b6eb-4af9-9448-00bb5d9ae74b`, { headers: HEADERS }),
      fetch(`${SERVICES.leave}/api/v1/leaves/requests`, { headers: HEADERS }),
    ]);

    const types = typesRes.ok ? await typesRes.json() : { items: [] };
    const balance = balanceRes.ok ? await balanceRes.json() : { items: [] };
    const requests = requestsRes.ok ? await requestsRes.json() : { items: [] };

    return NextResponse.json({ types: types.items || [], balance: balance.items || [], requests: requests.items || [] });
  } catch (error) {
    return NextResponse.json({ error: 'İzin verileri alınamadı', types: [], balance: [], requests: [] }, { status: 500 });
  }
}

// POST /api/leaves — submit leave request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${SERVICES.leave}/api/v1/leaves/requests`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'İzin talebi gönderilemedi' }, { status: 500 });
  }
}

// PATCH /api/leaves — Approve or reject leave request
export async function PATCH(req: NextRequest) {
  try {
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
      headers: HEADERS,
      body: JSON.stringify({ status, notes: managerNotes || '' }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const audit = createAuditLogger(HEADERS['X-Employee-Id'], 'manager');
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
