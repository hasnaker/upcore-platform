import { NextResponse } from 'next/server';
import { SERVICES, DEV_HEADERS } from '@/lib/service-urls';

export async function GET() {
  try {
    const res = await fetch(`${SERVICES.document}/api/v1/documents`, { headers: DEV_HEADERS, cache: 'no-store' });
    const data = res.ok ? await res.json() : { items: [] };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${SERVICES.document}/api/v1/documents`, {
      method: 'POST',
      headers: DEV_HEADERS,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Belge yüklenemedi' }, { status: 500 });
  }
}
