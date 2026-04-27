import { NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

/**
 * Org Design API — organizational structure overview with cost analysis.
 *
 * GET: Returns departments with headcount/cost, level distribution, metrics, history.
 */

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // 1. Departments with employee counts, manager, and cost
    const deptResult = await pool.query(
      `SELECT
         d.id,
         d.name_tr,
         COUNT(e.id)::text AS headcount,
         COALESCE((SELECT CONCAT(m.ad, ' ', m.soyad) FROM app.employees m WHERE m.department_id = d.id AND m.tenant_id = d.tenant_id ORDER BY m.created_at LIMIT 1), '-') AS manager_name,
         COALESCE(ROUND(AVG(ec.base_salary))::text, '0') AS avg_salary,
         COALESCE(SUM(ec.base_salary)::text, '0') AS total_cost
       FROM app.departments d
       LEFT JOIN app.employees e ON e.department_id = d.id AND e.tenant_id = $1
       LEFT JOIN app.employee_compensation ec ON ec.employee_id = e.id AND ec.tenant_id = $1
       WHERE d.tenant_id = $1
       GROUP BY d.id, d.name_tr
       ORDER BY COUNT(e.id) DESC`,
      [TENANT_ID]
    );

    // 2. Level distribution (from position_definitions)
    const levelResult = await pool.query(
      `SELECT
         COALESCE(pd.job_level, 'unassigned') AS job_level,
         COUNT(*)::text AS count
       FROM app.employees e
       LEFT JOIN app.position_definitions pd ON pd.id = e.position_id
       WHERE e.tenant_id = $1
       GROUP BY pd.job_level
       ORDER BY count DESC`,
      [TENANT_ID]
    );

    // 3. Historical snapshots
    const historyResult = await pool.query(
      `SELECT
         snapshot_date::text AS snapshot_date,
         total_headcount::text AS headcount
       FROM app.org_snapshots
       WHERE tenant_id = $1
       ORDER BY snapshot_date DESC
       LIMIT 12`,
      [TENANT_ID]
    );

    // 4. Tenure and span of control
    const tenureResult = await pool.query(
      `SELECT
         e.hire_date::text AS hire_date,
         (SELECT COUNT(*) FROM app.employees sub WHERE sub.manager_id = e.id AND sub.tenant_id = $1)::text AS direct_reports
       FROM app.employees e
       WHERE e.tenant_id = $1`,
      [TENANT_ID]
    );

    await pool.end();

    // Build departments array
    const departments = deptResult.rows.map((r) => ({
      name: r.name_tr,
      headcount: Number(r.headcount),
      manager: r.manager_name || 'Atanmamis',
      avgSalary: Number(r.avg_salary),
      totalCost: Number(r.total_cost),
    }));

    // Build level map
    const levels: Record<string, number> = {};
    for (const row of levelResult.rows) {
      const key = row.job_level.toLowerCase();
      levels[key] = Number(row.count);
    }

    // Compute metrics
    const totalHeadcount = departments.reduce((sum, d) => sum + d.headcount, 0);
    const totalCost = departments.reduce((sum, d) => sum + d.totalCost, 0);

    // Avg span of control (only for managers with direct reports > 0)
    const managers = tenureResult.rows
      .map((r) => Number(r.direct_reports))
      .filter((dr) => dr > 0);
    const avgSpanOfControl =
      managers.length > 0
        ? Math.round((managers.reduce((s, v) => s + v, 0) / managers.length) * 10) / 10
        : 0;

    // Avg tenure in years
    const now = Date.now();
    const tenures = tenureResult.rows
      .filter((r) => r.hire_date)
      .map((r) => (now - new Date(r.hire_date as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const avgTenure =
      tenures.length > 0
        ? Math.round((tenures.reduce((s, v) => s + v, 0) / tenures.length) * 10) / 10
        : 0;

    // History
    const history = historyResult.rows.map((r) => ({
      date: r.snapshot_date,
      headcount: Number(r.headcount),
    }));

    return NextResponse.json({
      departments,
      levels,
      metrics: {
        totalHeadcount,
        avgSpanOfControl,
        totalCost,
        avgTenure,
      },
      history,
    });
  } catch (error) {
    console.error('Org Design API error:', error);
    return NextResponse.json(
      {
        error: 'Organizasyon verileri alinamadi',
        departments: [],
        levels: {},
        metrics: { totalHeadcount: 0, avgSpanOfControl: 0, totalCost: 0, avgTenure: 0 },
        history: [],
      },
      { status: 500 }
    );
  }
}
