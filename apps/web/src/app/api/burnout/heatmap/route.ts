import { NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

// This API route queries burnout signals directly from PostgreSQL
// and returns heatmap data for the frontend.
// In production, this would call the burnout service API.

export async function GET() {
  try {
    // Use pg directly for this API route
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Query burnout heatmap: avg BAT total per department per week
    const result = await pool.query(`
      SELECT
        COALESCE(d.name_tr, 'Genel') as department_name,
        d.id as department_id,
        date_trunc('week', bs.ts)::date as week_start,
        ROUND(AVG(bs.feature_value)::numeric, 2) as avg_score,
        COUNT(DISTINCT bs.employee_id) as respondent_count
      FROM app.burnout_signals bs
      JOIN app.employees e ON e.id = bs.employee_id AND e.tenant_id = bs.tenant_id
      LEFT JOIN app.departments d ON d.id = e.department_id
      WHERE bs.tenant_id = '${TENANT_ID}'
        AND bs.feature_name = 'bat_total'
        AND bs.ts >= CURRENT_DATE - 28
      GROUP BY d.id, d.name_tr, date_trunc('week', bs.ts)
      ORDER BY d.name_tr, week_start
    `);

    // Query critical employees (highest bat_total)
    const critical = await pool.query(`
      SELECT
        e.id, e.ad, e.soyad, e.employee_no,
        COALESCE(d.name_tr, 'Genel') as department_name,
        bs.feature_value as score,
        bs.ts as last_date
      FROM app.burnout_signals bs
      JOIN app.employees e ON e.id = bs.employee_id AND e.tenant_id = bs.tenant_id
      LEFT JOIN app.departments d ON d.id = e.department_id
      WHERE bs.tenant_id = '${TENANT_ID}'
        AND bs.feature_name = 'bat_total'
        AND bs.ts = (SELECT MAX(ts) FROM app.burnout_signals WHERE employee_id = bs.employee_id AND feature_name = 'bat_total')
      ORDER BY bs.feature_value DESC
      LIMIT 10
    `);

    // Query JD-R balance per department
    const jdr = await pool.query(`
      SELECT
        COALESCE(d.name_tr, 'Genel') as department_name,
        MAX(CASE WHEN bs.feature_name = 'jdr_demands' THEN bs.feature_value END) as demands,
        MAX(CASE WHEN bs.feature_name = 'jdr_resources' THEN bs.feature_value END) as resources
      FROM app.burnout_signals bs
      JOIN app.employees e ON e.id = bs.employee_id AND e.tenant_id = bs.tenant_id
      LEFT JOIN app.departments d ON d.id = e.department_id
      WHERE bs.tenant_id = '${TENANT_ID}'
        AND bs.feature_name IN ('jdr_demands', 'jdr_resources')
        AND bs.ts >= CURRENT_DATE - 7
      GROUP BY d.id, d.name_tr
    `);

    // Overall stats
    const stats = await pool.query(`
      SELECT
        ROUND(AVG(feature_value)::numeric, 2) as avg_total,
        COUNT(DISTINCT CASE WHEN feature_value >= 3.02 THEN employee_id END) as red_count,
        COUNT(DISTINCT employee_id) as total_employees
      FROM app.burnout_signals
      WHERE tenant_id = '${TENANT_ID}'
        AND feature_name = 'bat_total'
        AND ts >= CURRENT_DATE - 7
    `);

    await pool.end();

    return NextResponse.json({
      heatmap: result.rows,
      critical: critical.rows,
      jdr: jdr.rows,
      stats: stats.rows[0] || { avg_total: 0, red_count: 0, total_employees: 0 },
    });
  } catch (error) {
    console.error('Burnout heatmap error:', error);
    return NextResponse.json(
      { error: 'Burnout verileri alınamadı', details: String(error) },
      { status: 500 }
    );
  }
}
