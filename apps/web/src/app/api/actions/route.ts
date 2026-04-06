import { NextResponse } from 'next/server';
import { SERVICES, DB_URL, TENANT_ID } from '@/lib/service-urls';

export async function GET() {
  try {
    // Get actions from ML action-center service
    const actionsRes = await fetch(`${SERVICES.actionCenter}/v1/actions/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: TENANT_ID, user_id: '00000000-0000-0000-0000-000000000001', role: 'hr_director', limit: 5 }),
    }).catch(() => null);

    let mlActions = [];
    if (actionsRes?.ok) {
      const data = await actionsRes.json();
      mlActions = data.actions || [];
    }

    // Also get burnout stats for context
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const criticalRes = await pool.query(`
      SELECT e.id, e.ad, e.soyad, COALESCE(d.name_tr, 'Genel') as dept,
             bs.feature_value as score
      FROM app.burnout_signals bs
      JOIN app.employees e ON e.id = bs.employee_id
      LEFT JOIN app.departments d ON d.id = e.department_id
      WHERE bs.tenant_id = $1 AND bs.feature_name = 'bat_total'
        AND bs.ts = (SELECT MAX(ts) FROM app.burnout_signals WHERE employee_id = bs.employee_id AND feature_name = 'bat_total')
      ORDER BY bs.feature_value DESC LIMIT 5
    `, [TENANT_ID]);

    // Get recommendations for top critical employee
    let recommendations: unknown[] = [];
    if (criticalRes.rows[0]) {
      const topEmployee = criticalRes.rows[0];
      const recRes = await fetch(`${SERVICES.recommend}/v1/recommend/individual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: TENANT_ID,
          employee_id: topEmployee.id,
          burnout_prediction: { '30d': topEmployee.score / 5 },
          top_k: 3,
        }),
      }).catch(() => null);
      if (recRes?.ok) {
        const recData = await recRes.json();
        recommendations = recData.recommendations || [];
      }
    }

    // Get burnout prediction for top employee
    let prediction = null;
    if (criticalRes.rows[0]) {
      const predRes = await fetch(`${SERVICES.burnout}/v1/predict/burnout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: TENANT_ID,
          employee_id: criticalRes.rows[0].id,
          features: { bat_total: criticalRes.rows[0].score, jdr_demands_z: 1.2, jdr_resources_z: -0.5, tenure_months: 74 },
        }),
      }).catch(() => null);
      if (predRes?.ok) {
        prediction = await predRes.json();
      }
    }

    await pool.end();

    return NextResponse.json({
      ml_actions: mlActions,
      critical_employees: criticalRes.rows,
      recommendations,
      prediction,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Action verileri alınamadı', ml_actions: [], critical_employees: [], recommendations: [], prediction: null }, { status: 500 });
  }
}
