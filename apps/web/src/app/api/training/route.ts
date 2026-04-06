import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const programs = await pool.query(
      `SELECT tp.id, tp.code, tp.name_tr, tp.description_tr, tp.category, tp.delivery_mode,
              tp.duration_hours, tp.provider, tp.cost_per_person, tp.skill_tags,
              (SELECT count(*) FROM app.training_enrollments te WHERE te.program_id = tp.id) as enrollment_count,
              (SELECT count(*) FROM app.training_enrollments te WHERE te.program_id = tp.id AND te.status = 'completed') as completion_count
       FROM app.training_programs tp
       WHERE tp.tenant_id = $1 AND tp.active = true ORDER BY tp.name_tr`,
      [TENANT_ID]
    );

    const skills = await pool.query(
      `SELECT sm.skill_name, sm.skill_category, sm.current_level, sm.target_level,
              e.ad as first_name, e.soyad as last_name
       FROM app.skill_matrix sm JOIN app.employees e ON e.id = sm.employee_id
       WHERE sm.tenant_id = $1 ORDER BY (sm.target_level - sm.current_level) DESC`,
      [TENANT_ID]
    );

    const enrollStats = await pool.query(
      `SELECT count(*) as total, count(*) FILTER (WHERE status = 'completed') as completed,
              AVG(feedback_rating) FILTER (WHERE feedback_rating IS NOT NULL) as avg_feedback
       FROM app.training_enrollments WHERE tenant_id = $1`,
      [TENANT_ID]
    );

    const es = enrollStats.rows[0] || {};
    const totalEnrolled = Number(es.total) || 0;
    const totalCompleted = Number(es.completed) || 0;
    const skillGaps = skills.rows.filter((s) => Number(s.target_level) > Number(s.current_level)).length;

    await pool.end();

    return NextResponse.json({
      programs: programs.rows.map((r) => ({
        id: r.id, code: r.code, name: r.name_tr, category: r.category,
        deliveryMode: r.delivery_mode, durationHours: Number(r.duration_hours),
        provider: r.provider || '', costPerPerson: Number(r.cost_per_person),
        skillTags: r.skill_tags || [], enrollmentCount: Number(r.enrollment_count),
        completionCount: Number(r.completion_count),
      })),
      skills: skills.rows.map((r) => ({
        employeeName: `${r.first_name} ${r.last_name}`, skillName: r.skill_name,
        category: r.skill_category || '', currentLevel: Number(r.current_level),
        targetLevel: Number(r.target_level), gap: Number(r.target_level) - Number(r.current_level),
      })),
      stats: {
        totalPrograms: programs.rows.length,
        completionRate: totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0,
        avgFeedback: es.avg_feedback ? Math.round(Number(es.avg_feedback) * 10) / 10 : 0,
        skillGapCount: skillGaps,
      },
    });
  } catch (error) {
    console.error('Training API error:', error);
    return NextResponse.json({ error: 'Eğitim verileri alınamadı', programs: [], skills: [], stats: { totalPrograms: 0, completionRate: 0, avgFeedback: 0, skillGapCount: 0 } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    if (body.action === 'enroll') {
      const { employeeId, programId } = body;
      if (!employeeId || !programId) {
        return NextResponse.json({ error: 'employeeId ve programId zorunludur' }, { status: 400 });
      }
      await pool.query(
        `INSERT INTO app.training_enrollments (tenant_id, employee_id, program_id, status, enrolled_at)
         VALUES ($1, $2, $3, 'enrolled', NOW())`,
        [TENANT_ID, employeeId, programId]
      );
      await pool.end();
      return NextResponse.json({ success: true, message: 'Kayıt başarılı' });
    }

    if (body.action === 'create_program') {
      const { code, name_tr, category, deliveryMode, durationHours, provider, costPerPerson, skillTags } = body;
      if (!code || !name_tr) {
        return NextResponse.json({ error: 'code ve name_tr zorunludur' }, { status: 400 });
      }
      const result = await pool.query(
        `INSERT INTO app.training_programs (tenant_id, code, name_tr, category, delivery_mode, duration_hours, provider, cost_per_person, skill_tags, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING id`,
        [TENANT_ID, code, name_tr, category || 'technical', deliveryMode || 'online', durationHours || 0, provider || '', costPerPerson || 0, skillTags || []]
      );
      await pool.end();
      return NextResponse.json({ success: true, id: result.rows[0]?.id, message: 'Program oluşturuldu' });
    }

    await pool.end();
    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
  } catch (error) {
    console.error('Training POST error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
