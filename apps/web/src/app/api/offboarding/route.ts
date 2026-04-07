import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

// GET /api/offboarding — list offboarding processes + exit interviews
export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const processes = await pool.query(`
      SELECT
        op.id as process_id,
        op.employee_id,
        e.ad || ' ' || e.soyad as name,
        COALESCE(d.name_tr, 'Genel') as department,
        op.reason,
        op.last_working_day,
        op.notice_period_days,
        op.status,
        op.exit_interview_completed,
        op.equipment_returned,
        op.access_revoked,
        op.knowledge_transfer_status,
        op.created_at
      FROM app.offboarding_processes op
      JOIN app.employees e ON e.id = op.employee_id AND e.tenant_id = op.tenant_id
      LEFT JOIN app.departments d ON d.id = e.department_id
      WHERE op.tenant_id = $1
      ORDER BY op.created_at DESC
    `, [TENANT_ID]);

    const exitInterviews = await pool.query(`
      SELECT
        ei.id as interview_id,
        ei.process_id,
        ei.overall_satisfaction,
        ei.reasons_for_leaving,
        ei.what_could_improve,
        ei.would_recommend,
        ei.would_return,
        ei.comments,
        ei.conducted_at
      FROM app.exit_interviews ei
      JOIN app.offboarding_processes op ON op.id = ei.process_id
      WHERE op.tenant_id = $1
      ORDER BY ei.conducted_at DESC
    `, [TENANT_ID]).catch(() => ({ rows: [] }));

    // Build summary
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let activeCount = 0;
    let completedThisMonth = 0;
    let totalDurationDays = 0;
    let completedCount = 0;

    for (const p of processes.rows) {
      if (p.status === 'active' || p.status === 'in_progress') {
        activeCount++;
      }
      if (p.status === 'completed') {
        completedCount++;
        // Use last_working_day as the completion reference (updated_at doesn't exist)
        const completionDate = p.last_working_day ? new Date(p.last_working_day) : new Date(p.created_at);
        if (completionDate >= startOfMonth) {
          completedThisMonth++;
        }
        const createdAt = new Date(p.created_at);
        totalDurationDays += Math.ceil((completionDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    const avgDurationDays = completedCount > 0 ? Math.round(totalDurationDays / completedCount) : 0;

    // Map exit interviews by process_id
    const interviewMap = new Map<string, typeof exitInterviews.rows[number]>();
    for (const ei of exitInterviews.rows) {
      interviewMap.set(ei.process_id as string, ei);
    }

    const offboardingProcesses = processes.rows.map((p) => ({
      processId: p.process_id,
      employeeId: p.employee_id,
      name: p.name,
      department: p.department,
      reason: p.reason,
      lastWorkingDay: p.last_working_day,
      noticePeriodDays: p.notice_period_days,
      status: p.status,
      exitInterviewCompleted: p.exit_interview_completed,
      equipmentReturned: p.equipment_returned,
      accessRevoked: p.access_revoked,
      knowledgeTransferStatus: p.knowledge_transfer_status,
      createdAt: p.created_at,
      exitInterview: interviewMap.get(p.process_id) ? {
        interviewId: interviewMap.get(p.process_id)!.interview_id,
        interviewerName: interviewMap.get(p.process_id)!.interviewer_name,
        interviewDate: interviewMap.get(p.process_id)!.interview_date,
        overallSatisfaction: interviewMap.get(p.process_id)!.overall_satisfaction,
        reasonForLeaving: interviewMap.get(p.process_id)!.reason_for_leaving,
        wouldRecommend: interviewMap.get(p.process_id)!.would_recommend,
        feedbackSummary: interviewMap.get(p.process_id)!.feedback_summary,
      } : null,
    }));

    await pool.end();

    return NextResponse.json({
      processes: offboardingProcesses,
      summary: {
        activeCount,
        completedThisMonth,
        avgDurationDays,
      },
    });
  } catch (error) {
    console.error('Offboarding GET error:', error);
    return NextResponse.json(
      { error: 'Cikis sureci verileri alinamadi', details: String(error) },
      { status: 500 },
    );
  }
}

// POST /api/offboarding — start a new offboarding process
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, reason, lastWorkingDay, noticePeriodDays } = body as {
      employeeId: string;
      reason: string;
      lastWorkingDay: string;
      noticePeriodDays: number;
    };

    if (!employeeId || !reason || !lastWorkingDay) {
      return NextResponse.json(
        { error: 'employeeId, reason ve lastWorkingDay zorunludur' },
        { status: 400 },
      );
    }

    const validReasons = ['resignation', 'termination', 'mutual', 'retirement', 'contract_end'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Gecersiz reason. Gecerli degerler: resignation, termination, mutual, retirement, contract_end' },
        { status: 400 },
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query(`
      INSERT INTO app.offboarding_processes (
        tenant_id, employee_id, reason, last_working_day, notice_period_days,
        status, exit_interview_completed, equipment_returned, access_revoked,
        knowledge_transfer_status
      )
      VALUES ($1, $2, $3, $4, $5, 'active', false, false, false, 'pending')
      RETURNING id
    `, [TENANT_ID, employeeId, reason, lastWorkingDay, noticePeriodDays || 0]);

    const processId = result.rows[0]?.id;

    await pool.end();

    return NextResponse.json({
      success: true,
      processId,
      message: 'Cikis sureci baslatildi',
    }, { status: 201 });
  } catch (error) {
    console.error('Offboarding POST error:', error);
    return NextResponse.json(
      { error: 'Cikis sureci baslatilamadi', details: String(error) },
      { status: 500 },
    );
  }
}

// PATCH /api/offboarding — update checklist field
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { processId, field, value } = body as {
      processId: string;
      field: 'exit_interview_completed' | 'equipment_returned' | 'access_revoked' | 'knowledge_transfer_status';
      value: boolean | string;
    };

    if (!processId || !field) {
      return NextResponse.json(
        { error: 'processId ve field zorunludur' },
        { status: 400 },
      );
    }

    const allowedFields = ['exit_interview_completed', 'equipment_returned', 'access_revoked', 'knowledge_transfer_status'];
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { error: 'Gecersiz field. Gecerli degerler: exit_interview_completed, equipment_returned, access_revoked, knowledge_transfer_status' },
        { status: 400 },
      );
    }

    if (field === 'knowledge_transfer_status') {
      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (typeof value !== 'string' || !validStatuses.includes(value)) {
        return NextResponse.json(
          { error: 'knowledge_transfer_status icin gecerli degerler: pending, in_progress, completed' },
          { status: 400 },
        );
      }
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    await pool.query(`
      UPDATE app.offboarding_processes
      SET ${field} = $1
      WHERE id = $2 AND tenant_id = $3
    `, [value, processId, TENANT_ID]);

    // Check if all items are completed to auto-complete the process
    if (field !== 'knowledge_transfer_status' || value === 'completed') {
      const checkResult = await pool.query(`
        SELECT exit_interview_completed, equipment_returned, access_revoked, knowledge_transfer_status
        FROM app.offboarding_processes
        WHERE id = $1 AND tenant_id = $2
      `, [processId, TENANT_ID]);

      const process = checkResult.rows[0];
      if (
        process &&
        process.exit_interview_completed === true &&
        process.equipment_returned === true &&
        process.access_revoked === true &&
        process.knowledge_transfer_status === 'completed'
      ) {
        await pool.query(`
          UPDATE app.offboarding_processes
          SET status = 'completed'
          WHERE id = $1 AND tenant_id = $2
        `, [processId, TENANT_ID]);
      }
    }

    await pool.end();

    return NextResponse.json({ success: true, message: 'Kontrol listesi guncellendi' });
  } catch (error) {
    console.error('Offboarding PATCH error:', error);
    return NextResponse.json(
      { error: 'Kontrol listesi guncellenemedi', details: String(error) },
      { status: 500 },
    );
  }
}
