import { NextResponse } from 'next/server';
import { SERVICES, DEV_HEADERS } from '@/lib/service-urls';

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
