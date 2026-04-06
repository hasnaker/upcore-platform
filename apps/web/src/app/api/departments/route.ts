import { NextRequest, NextResponse } from 'next/server';
import { SERVICES, DEV_HEADERS } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${SERVICES.organization}/api/v1/departments`, {
      method: 'POST',
      headers: DEV_HEADERS,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Departman olusturulamadi' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [deptRes, empRes] = await Promise.all([
      fetch(`${SERVICES.organization}/api/v1/departments`, { headers: DEV_HEADERS, cache: 'no-store' }),
      fetch(`${SERVICES.employee}/api/v1/employees?limit=100`, { headers: DEV_HEADERS, cache: 'no-store' }),
    ]);

    const departments = deptRes.ok ? await deptRes.json() : { items: [] };
    const employees = empRes.ok ? await empRes.json() : { items: [] };

    // Enrich departments with employee counts
    const deptList = (departments.items || []).map((d: Record<string, unknown>) => {
      const empCount = (employees.items || []).filter(
        (e: Record<string, unknown>) => e['department_id'] === d['id']
      ).length;
      return { ...d, employee_count: empCount };
    });

    return NextResponse.json({ departments: deptList, total_employees: employees.total || 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Departman verileri alınamadı', departments: [] }, { status: 500 });
  }
}

// PATCH /api/departments — Update department
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { departmentId, name_tr, description, cost_center, active } = body as {
      departmentId?: string;
      name_tr?: string;
      description?: string;
      cost_center?: string;
      active?: boolean;
    };

    if (!departmentId) {
      return NextResponse.json({ error: 'departmentId zorunludur' }, { status: 400 });
    }

    // Build partial update payload — only include provided fields
    const updatePayload: Record<string, unknown> = {};
    if (name_tr !== undefined) updatePayload['name_tr'] = name_tr;
    if (description !== undefined) updatePayload['description'] = description;
    if (cost_center !== undefined) updatePayload['cost_center'] = cost_center;
    if (active !== undefined) updatePayload['active'] = active;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek en az bir alan gereklidir' }, { status: 400 });
    }

    const res = await fetch(`${SERVICES.organization}/api/v1/departments/${departmentId}`, {
      method: 'PATCH',
      headers: DEV_HEADERS,
      body: JSON.stringify(updatePayload),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const audit = createAuditLogger(DEV_HEADERS['X-User-Id'], DEV_HEADERS['X-User-Role']);
    void audit.log('update', 'department', departmentId, undefined, updatePayload);

    return NextResponse.json({ success: true, department: data, message: 'Departman güncellendi' });
  } catch (error) {
    console.error('Department PATCH error:', error);
    return NextResponse.json({ error: 'Departman güncellenemedi' }, { status: 500 });
  }
}

// DELETE /api/departments — Soft-delete department
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');

    if (!departmentId) {
      return NextResponse.json({ error: 'departmentId query parametresi zorunludur' }, { status: 400 });
    }

    // Soft delete: set deleted_at and active = false via the organization service
    const res = await fetch(`${SERVICES.organization}/api/v1/departments/${departmentId}`, {
      method: 'PATCH',
      headers: DEV_HEADERS,
      body: JSON.stringify({ active: false, deleted_at: new Date().toISOString() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Departman silinemedi', details: data },
        { status: res.status },
      );
    }

    const audit = createAuditLogger(DEV_HEADERS['X-User-Id'], DEV_HEADERS['X-User-Role']);
    void audit.log('delete', 'department', departmentId);

    return NextResponse.json({ success: true, message: 'Departman pasif duruma alındı (soft delete)' });
  } catch (error) {
    console.error('Department DELETE error:', error);
    return NextResponse.json({ error: 'Departman silinemedi' }, { status: 500 });
  }
}
