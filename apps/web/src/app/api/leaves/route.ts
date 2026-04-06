import { NextResponse } from 'next/server';
import { SERVICES, DEV_HEADERS } from '@/lib/service-urls';

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
