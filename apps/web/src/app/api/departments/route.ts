import { NextResponse } from 'next/server';

const ORG_URL = 'http://localhost:8004';
const HEADERS = {
  'X-Tenant-Id': '11111111-1111-1111-1111-111111111111',
  'X-User-Id': '00000000-0000-0000-0000-000000000001',
  'X-User-Role': 'hr_director',
};

export async function GET() {
  try {
    const [deptRes, empRes] = await Promise.all([
      fetch(`${ORG_URL}/api/v1/departments`, { headers: HEADERS, cache: 'no-store' }),
      fetch('http://localhost:8003/api/v1/employees?limit=100', { headers: HEADERS, cache: 'no-store' }),
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
