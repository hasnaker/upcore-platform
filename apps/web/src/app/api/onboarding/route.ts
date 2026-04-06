import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Query onboarding plans joined with employees
    const plans = await pool.query(`
      SELECT
        op.id as plan_id,
        op.employee_id,
        e.ad || ' ' || e.soyad as name,
        COALESCE(d.name_tr, 'Genel') as department,
        op.start_date,
        op.status as plan_status,
        op.created_at
      FROM app.onboarding_plans op
      JOIN app.employees e ON e.id = op.employee_id AND e.tenant_id = op.tenant_id
      LEFT JOIN app.departments d ON d.id = e.department_id
      WHERE op.tenant_id = $1
      ORDER BY op.created_at DESC
    `, [TENANT_ID]);

    // Query all tasks for these plans
    const tasks = await pool.query(`
      SELECT
        ot.id as task_id,
        ot.plan_id,
        ot.title,
        ot.phase,
        ot.assignee_role,
        ot.status,
        ot.due_date,
        ot.completed_at
      FROM app.onboarding_tasks ot
      JOIN app.onboarding_plans op ON op.id = ot.plan_id
      WHERE op.tenant_id = $1
      ORDER BY ot.phase, ot.id
    `, [TENANT_ID]);

    // Group tasks by plan_id
    const tasksByPlan = new Map<string, Array<{
      taskId: string;
      title: string;
      phase: string;
      assigneeRole: string;
      status: string;
      dueDate: string | null;
      completedAt: string | null;
    }>>();

    for (const t of tasks.rows) {
      const planId = t.plan_id as string;
      if (!tasksByPlan.has(planId)) tasksByPlan.set(planId, []);
      tasksByPlan.get(planId)!.push({
        taskId: t.task_id,
        title: t.title,
        phase: t.phase,
        assigneeRole: t.assignee_role,
        status: t.status,
        dueDate: t.due_date,
        completedAt: t.completed_at,
      });
    }

    // Build response with summary
    let activeCount = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    const now = new Date();

    const onboardingPlans = plans.rows.map((p) => {
      const planTasks = tasksByPlan.get(p.plan_id) || [];
      const planCompleted = planTasks.filter((t) => t.status === 'completed').length;
      const planTotal = planTasks.length;

      if (p.plan_status === 'active') activeCount++;
      totalTasks += planTotal;
      completedTasks += planCompleted;

      for (const t of planTasks) {
        if (t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now) {
          overdueTasks++;
        }
      }

      return {
        planId: p.plan_id,
        employeeId: p.employee_id,
        name: p.name,
        department: p.department,
        startDate: p.start_date,
        planStatus: p.plan_status,
        tasks: planTasks,
        completionRate: planTotal > 0 ? Math.round((planCompleted / planTotal) * 100) : 0,
      };
    });

    await pool.end();

    return NextResponse.json({
      plans: onboardingPlans,
      summary: {
        activeCount,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        overdueTasks,
      },
    });
  } catch (error) {
    console.error('Onboarding API error:', error);
    return NextResponse.json(
      { error: 'Onboarding verileri alinamadi', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, status } = body as { taskId: string; status: string };

    if (!taskId || !status) {
      return NextResponse.json({ error: 'taskId ve status zorunludur' }, { status: 400 });
    }

    const validStatuses = ['completed', 'in_progress', 'skipped'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Gecersiz status. Gecerli degerler: completed, in_progress, skipped' },
        { status: 400 }
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const completedAt = status === 'completed' ? 'NOW()' : 'NULL';

    await pool.query(`
      UPDATE app.onboarding_tasks
      SET status = $1, completed_at = ${completedAt}
      WHERE id = $2
        AND plan_id IN (SELECT id FROM app.onboarding_plans WHERE tenant_id = $3)
    `, [status, taskId, TENANT_ID]);

    await pool.end();

    return NextResponse.json({ success: true, message: 'Gorev durumu guncellendi' });
  } catch (error) {
    console.error('Onboarding PATCH error:', error);
    return NextResponse.json(
      { error: 'Gorev guncellenemedi', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, startDate, tasks } = body as {
      employeeId: string;
      startDate: string;
      tasks: Array<{ title: string; phase: string; assigneeRole: string }>;
    };

    if (!employeeId || !startDate) {
      return NextResponse.json(
        { error: 'employeeId ve startDate zorunludur' },
        { status: 400 }
      );
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Create the onboarding plan
    const planResult = await pool.query(`
      INSERT INTO app.onboarding_plans (tenant_id, employee_id, start_date, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING id
    `, [TENANT_ID, employeeId, startDate]);

    const planId = planResult.rows[0]?.id;

    // Insert tasks if provided
    if (tasks && tasks.length > 0) {
      const values: string[] = [];
      const params: string[] = [];
      let paramIndex = 1;

      for (const task of tasks) {
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 'pending')`);
        params.push(planId, task.title, task.phase, task.assigneeRole);
        paramIndex += 4;
      }

      await pool.query(`
        INSERT INTO app.onboarding_tasks (plan_id, title, phase, assignee_role, status)
        VALUES ${values.join(', ')}
      `, params);
    }

    await pool.end();

    return NextResponse.json({
      success: true,
      planId,
      message: 'Onboarding plani olusturuldu',
    });
  } catch (error) {
    console.error('Onboarding POST error:', error);
    return NextResponse.json(
      { error: 'Onboarding plani olusturulamadi', details: String(error) },
      { status: 500 }
    );
  }
}
