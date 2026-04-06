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
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    if (body.action === 'create_survey') {
      const { name, surveyType, startDate, endDate } = body;
      if (!name || !surveyType) {
        return NextResponse.json({ error: 'name ve surveyType zorunludur' }, { status: 400 });
      }
      const result = await pool.query(
        `INSERT INTO app.engagement_surveys (tenant_id, name, survey_type, status, start_date, end_date)
         VALUES ($1, $2, $3, 'active', $4, $5) RETURNING id`,
        [TENANT_ID, name, surveyType, startDate || null, endDate || null]
      );
      await pool.end();
      return NextResponse.json({ success: true, id: result.rows[0]?.id, message: 'Anket oluşturuldu' });
    }

    if (body.action === 'create_action_plan') {
      const { title, description, ownerId, dueDate, departmentId } = body;
      if (!title) {
        return NextResponse.json({ error: 'title zorunludur' }, { status: 400 });
      }
      const result = await pool.query(
        `INSERT INTO app.engagement_action_plans (tenant_id, title, description, owner_id, due_date, department_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'planned') RETURNING id`,
        [TENANT_ID, title, description || '', ownerId || null, dueDate || null, departmentId || null]
      );
      await pool.end();
      return NextResponse.json({ success: true, id: result.rows[0]?.id, message: 'Aksiyon planı oluşturuldu' });
    }

    if (body.action === 'submit_response') {
      const { surveyId, employeeId, enpsScore, responses, comments } = body;
      if (!surveyId) {
        return NextResponse.json({ error: 'surveyId zorunludur' }, { status: 400 });
      }
      await pool.query(
        `INSERT INTO app.engagement_responses (survey_id, employee_id, enps_score, responses, comments)
         VALUES ($1, $2, $3, $4, $5)`,
        [surveyId, employeeId || null, enpsScore, JSON.stringify(responses || {}), comments || null]
      );
      await pool.end();
      return NextResponse.json({ success: true, message: 'Yanıt kaydedildi' });
    }

    // Legacy support: if no action field, treat as submit_response
    const { surveyId, employeeId, enpsScore, responses, comments } = body;
    await pool.query(
      `INSERT INTO app.engagement_responses (survey_id, employee_id, enps_score, responses, comments)
       VALUES ($1, $2, $3, $4, $5)`,
      [surveyId, employeeId || null, enpsScore, JSON.stringify(responses || {}), comments || null]
    );
    await pool.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Engagement submit error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
