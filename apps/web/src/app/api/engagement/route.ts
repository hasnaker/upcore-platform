import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const surveys = await pool.query(
      `SELECT id, name, survey_type, status, start_date, end_date FROM app.engagement_surveys
       WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [TENANT_ID]
    );

    const responses = await pool.query(
      `SELECT er.enps_score, er.responses, er.department_id, d.name_tr as department
       FROM app.engagement_responses er
       LEFT JOIN app.departments d ON d.id = er.department_id
       JOIN app.engagement_surveys es ON es.id = er.survey_id
       WHERE es.tenant_id = $1`,
      [TENANT_ID]
    );

    // Compute eNPS
    const enpsScores = responses.rows.map((r) => Number(r.enps_score)).filter((s) => s >= 0);
    const promoters = enpsScores.filter((s) => s >= 9).length;
    const passives = enpsScores.filter((s) => s >= 7 && s <= 8).length;
    const detractors = enpsScores.filter((s) => s <= 6).length;
    const total = enpsScores.length;
    const enpsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    // Department scores
    const deptMap = new Map<string, { satisfaction: number[]; growth: number[]; culture: number[]; count: number }>();
    for (const r of responses.rows) {
      const dept = r.department || 'Bilinmiyor';
      if (!deptMap.has(dept)) deptMap.set(dept, { satisfaction: [], growth: [], culture: [], count: 0 });
      const d = deptMap.get(dept)!;
      d.count++;
      const resp = r.responses as Record<string, number> | null;
      if (resp) {
        if (resp['satisfaction']) d.satisfaction.push(resp['satisfaction']);
        if (resp['growth']) d.growth.push(resp['growth']);
        if (resp['culture']) d.culture.push(resp['culture']);
      }
    }

    const departmentScores = Array.from(deptMap.entries()).map(([dept, data]) => ({
      department: dept,
      satisfaction: data.satisfaction.length > 0 ? Math.round(data.satisfaction.reduce((a, b) => a + b, 0) / data.satisfaction.length * 10) / 10 : 0,
      growth: data.growth.length > 0 ? Math.round(data.growth.reduce((a, b) => a + b, 0) / data.growth.length * 10) / 10 : 0,
      culture: data.culture.length > 0 ? Math.round(data.culture.reduce((a, b) => a + b, 0) / data.culture.length * 10) / 10 : 0,
      responseCount: data.count,
    }));

    const actionPlans = await pool.query(
      `SELECT id, title, description, status, due_date, d.name_tr as department
       FROM app.engagement_action_plans eap
       LEFT JOIN app.departments d ON d.id = eap.department_id
       WHERE eap.tenant_id = $1 ORDER BY eap.created_at DESC`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    await pool.end();

    return NextResponse.json({
      surveys: surveys.rows,
      eNPS: { score: enpsScore, promoters, passives, detractors, total },
      departmentScores,
      actionPlans: actionPlans.rows.map((r) => ({
        id: r.id, title: r.title, description: r.description,
        owner: r.department || '', status: r.status, dueDate: r.due_date,
      })),
    });
  } catch (error) {
    console.error('Engagement API error:', error);
    return NextResponse.json({ error: 'Bağlılık verileri alınamadı', surveys: [], eNPS: { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 }, departmentScores: [], actionPlans: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { surveyId, employeeId, enpsScore, responses, comments } = body;
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });
    await pool.query(
      `INSERT INTO app.engagement_responses (survey_id, employee_id, enps_score, responses, comments)
       VALUES ($1, $2, $3, $4, $5)`,
      [surveyId, employeeId || null, enpsScore, JSON.stringify(responses || {}), comments || null]
    );
    await pool.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Engagement submit error:', error);
    return NextResponse.json({ error: 'Anket gönderilemedi' }, { status: 500 });
  }
}
