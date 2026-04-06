import { NextRequest, NextResponse } from 'next/server';
import { SERVICES, DEV_HEADERS } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

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

/**
 * DELETE — Delete a document by ID.
 */
export async function DELETE(req: NextRequest) {
  try {
    const documentId = req.nextUrl.searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId parametresi gerekli' }, { status: 400 });
    }

    const res = await fetch(`${SERVICES.document}/api/v1/documents/${documentId}`, {
      method: 'DELETE',
      headers: DEV_HEADERS,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ error: 'Belge silinemedi', details: data }, { status: res.status });
    }

    // Audit
    const actorId = req.headers.get('x-user-id') || DEV_HEADERS['X-User-Id'];
    const actorRole = req.headers.get('x-user-role') || DEV_HEADERS['X-User-Role'];
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('delete', 'document', documentId);

    return NextResponse.json({ success: true, documentId });
  } catch {
    return NextResponse.json({ error: 'Belge silinemedi' }, { status: 500 });
  }
}
