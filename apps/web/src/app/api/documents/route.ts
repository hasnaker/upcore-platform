import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';
import { createAuditLogger } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRequestContext(request);
    const res = await fetch(`${SERVICES.document}/api/v1/documents`, {
      headers: buildServiceHeaders(ctx),
      cache: 'no-store',
    });
    const data = res.ok ? await res.json() : { items: [] };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequestContext(request);
    const body = await request.json();
    const res = await fetch(`${SERVICES.document}/api/v1/documents`, {
      method: 'POST',
      headers: buildServiceHeaders(ctx),
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
    const ctx = await getRequestContext(req);
    const documentId = req.nextUrl.searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId parametresi gerekli' }, { status: 400 });
    }

    const res = await fetch(`${SERVICES.document}/api/v1/documents/${documentId}`, {
      method: 'DELETE',
      headers: buildServiceHeaders(ctx),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ error: 'Belge silinemedi', details: data }, { status: res.status });
    }

    // Audit
    const audit = createAuditLogger(ctx.userId, ctx.userRole, ctx.tenantId);
    void audit.log('delete', 'document', documentId);

    return NextResponse.json({ success: true, documentId });
  } catch {
    return NextResponse.json({ error: 'Belge silinemedi' }, { status: 500 });
  }
}
