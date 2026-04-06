import { NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const employees = await pool.query(
      `SELECT ec.id, ec.base_salary, ec.currency, ec.bonus_target_pct, ec.equity_units,
              ec.benefits_package, ec.compa_ratio, ec.effective_date,
              e.ad as first_name, e.soyad as last_name, d.name_tr as department
       FROM app.employee_compensation ec
       JOIN app.employees e ON e.id = ec.employee_id
       LEFT JOIN app.departments d ON d.id = e.department_id
       WHERE ec.tenant_id = $1
       ORDER BY ec.base_salary DESC`,
      [TENANT_ID]
    );

    const bands = await pool.query(
      `SELECT job_level, job_family, min_salary, mid_salary, max_salary
       FROM app.salary_bands WHERE tenant_id = $1 AND active = true
       ORDER BY job_family, min_salary`,
      [TENANT_ID]
    );

    const reviews = await pool.query(
      `SELECT cr.id, cr.review_cycle, cr.current_salary, cr.proposed_salary, cr.increase_pct,
              cr.increase_reason, cr.status, e.ad, e.soyad
       FROM app.compensation_reviews cr
       JOIN app.employees e ON e.id = cr.employee_id
       WHERE cr.tenant_id = $1 ORDER BY cr.created_at DESC LIMIT 20`,
      [TENANT_ID]
    );

    const salaries = employees.rows.map((r) => Number(r.base_salary));
    const avgSalary = salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : 0;
    const sorted = [...salaries].sort((a, b) => a - b);
    const medianSalary = sorted.length > 0
      ? sorted.length % 2 === 1
        ? (sorted[Math.floor(sorted.length / 2)] ?? 0)
        : Math.round(((sorted[sorted.length / 2 - 1] ?? 0) + (sorted[sorted.length / 2] ?? 0)) / 2)
      : 0;
    const totalPayroll = salaries.reduce((a, b) => a + b, 0);
    const compaRatios = employees.rows.map((r) => Number(r.compa_ratio)).filter((c) => c > 0);
    const avgCompaRatio = compaRatios.length > 0 ? compaRatios.reduce((a, b) => a + b, 0) / compaRatios.length : 1.0;

    await pool.end();

    return NextResponse.json({
      employees: employees.rows.map((r) => ({
        name: `${r.first_name} ${r.last_name}`,
        department: r.department || '',
        baseSalary: Number(r.base_salary),
        bonusTargetPct: Number(r.bonus_target_pct),
        benefitsPackage: r.benefits_package,
        compaRatio: Number(r.compa_ratio),
      })),
      bands: bands.rows.map((r) => ({
        jobLevel: r.job_level,
        jobFamily: r.job_family || '',
        min: Number(r.min_salary),
        mid: Number(r.mid_salary),
        max: Number(r.max_salary),
      })),
      reviews: reviews.rows.map((r) => ({
        id: r.id,
        cycle: r.review_cycle,
        employee: `${r.ad} ${r.soyad}`,
        currentSalary: r.current_salary ? Number(r.current_salary) : null,
        proposedSalary: r.proposed_salary ? Number(r.proposed_salary) : null,
        increasePct: r.increase_pct ? Number(r.increase_pct) : null,
        status: r.status,
      })),
      stats: { avgSalary, medianSalary, totalPayroll, avgCompaRatio: Math.round(avgCompaRatio * 100) / 100 },
    });
  } catch (error) {
    console.error('Compensation API error:', error);
    return NextResponse.json({ error: 'Ücret verileri alınamadı', employees: [], bands: [], reviews: [], stats: { avgSalary: 0, medianSalary: 0, totalPayroll: 0, avgCompaRatio: 1.0 } }, { status: 500 });
  }
}
