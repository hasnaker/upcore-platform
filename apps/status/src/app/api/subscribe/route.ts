import { NextResponse } from 'next/server';

const STATUS_API_BASE =
  process.env['STATUS_API_BASE'] ?? 'http://localhost:8030';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const res = await fetch(`${STATUS_API_BASE}/api/v2/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
