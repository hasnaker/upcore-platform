import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { enrollmentId, status, score, feedbackRating } = body;

    if (!enrollmentId || !status) {
      return NextResponse.json({ error: 'enrollmentId ve status zorunludur' }, { status: 400 });
    }

    const validStatuses = ['in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Geçersiz status. Geçerli değerler: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const setClauses: string[] = ['status = $1'];
    const params: (string | number | null)[] = [status, enrollmentId, TENANT_ID];
    let paramIndex = 4;

    if (status === 'completed') {
      setClauses.push('completed_at = now()');
    }

    if (score !== undefined) {
      setClauses.push(`score = $${paramIndex}`);
      params.push(score);
      paramIndex++;
    }

    if (feedbackRating !== undefined) {
      setClauses.push(`feedback_rating = $${paramIndex}`);
      params.push(feedbackRating);
      paramIndex++;
    }

    const result = await pool.query(
      `UPDATE app.training_enrollments SET ${setClauses.join(', ')} WHERE id = $2 AND tenant_id = $3 RETURNING id`,
      params
    );

    await pool.end();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'training_enrollment', enrollmentId, undefined, { status, score, feedbackRating });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Training PATCH error:', error);
    return NextResponse.json({ error: 'Kayıt güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json({ error: 'programId zorunludur' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // CASCADE will handle enrollments
    const result = await pool.query(
      `DELETE FROM app.training_programs WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [programId, TENANT_ID]
    );

    await pool.end();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Program bulunamadı' }, { status: 404 });
    }

    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('delete', 'training_program', programId, undefined, { programId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Training DELETE error:', error);
    return NextResponse.json({ error: 'Program silinemedi' }, { status: 500 });
  }
}
