import { NextResponse } from 'next/server';

const STATUS_API_BASE = process.env['STATUS_API_BASE'] ?? 'http://localhost:8030';

export const dynamic = 'force-dynamic';
export const revalidate = 120;

export async function GET() {
  const res = await fetch(`${STATUS_API_BASE}/api/v2/rss`, {
    next: { revalidate: 120 },
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
    },
  });
}
