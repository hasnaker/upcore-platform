import { NextResponse } from 'next/server';

const DOC_URL = 'http://localhost:8006';
const HEADERS = {
  'X-Tenant-Id': '11111111-1111-1111-1111-111111111111',
  'X-User-Id': '00000000-0000-0000-0000-000000000001',
  'X-User-Role': 'hr_director',
  'Content-Type': 'application/json',
};

export async function GET() {
  try {
    const res = await fetch(`${DOC_URL}/api/v1/documents`, { headers: HEADERS, cache: 'no-store' });
    const data = res.ok ? await res.json() : { items: [] };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${DOC_URL}/api/v1/documents`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Belge yüklenemedi' }, { status: 500 });
  }
}
