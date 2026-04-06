import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

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

/**
 * POST — Create compensation review (salary increase proposal)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeName, currentSalary, proposedSalary, increasePct, reason } = body;

    if (!employeeName || !proposedSalary) {
      return NextResponse.json({ error: 'employeeName ve proposedSalary zorunlu' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Find employee by name
    const empResult = await pool.query(
      `SELECT id FROM app.employees WHERE tenant_id = $1 AND CONCAT(ad, ' ', soyad) ILIKE $2 LIMIT 1`,
      [TENANT_ID, `%${employeeName}%`]
    );
    const employeeId = empResult.rows[0]?.id;

    if (!employeeId) {
      await pool.end();
      return NextResponse.json({ error: 'Çalışan bulunamadı' }, { status: 404 });
    }

    // Create compensation review
    const result = await pool.query(
      `INSERT INTO app.compensation_reviews (tenant_id, employee_id, review_cycle, current_salary, proposed_salary, increase_pct, increase_reason, status)
       VALUES ($1, $2, '2026-Q2', $3, $4, $5, $6, 'pending')
       RETURNING id`,
      [TENANT_ID, employeeId, currentSalary, proposedSalary, increasePct, reason]
    );

    await pool.end();

    // Audit log
    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('create', 'compensation_review', result.rows[0]?.id, undefined, {
      employeeName, currentSalary, proposedSalary, increasePct, reason,
    });

    return NextResponse.json({ success: true, id: result.rows[0]?.id });
  } catch (error) {
    console.error('Compensation review error:', error);
    return NextResponse.json({ error: 'Teklif oluşturulamadı' }, { status: 500 });
  }
}
