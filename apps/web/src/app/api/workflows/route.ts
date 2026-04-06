import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID, DEV_HEADERS } from '@/lib/service-urls';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const definitions = await pool.query(
      `SELECT id, name, trigger_type, trigger_config, steps, active FROM app.workflow_definitions
       WHERE tenant_id = $1 ORDER BY name`,
      [TENANT_ID]
    );

    // Enhanced: also return definition steps alongside instances for UI step display
    const instances = await pool.query(
      `SELECT wi.id, wd.name as definition_name, wi.trigger_entity_type, wi.trigger_entity_id,
              wi.current_step, jsonb_array_length(wd.steps) as total_steps,
              wd.steps as definition_steps,
              wi.status, wi.started_at, wi.completed_at,
              wi.definition_id
       FROM app.workflow_instances wi
       JOIN app.workflow_definitions wd ON wd.id = wi.definition_id
       WHERE wi.tenant_id = $1 ORDER BY wi.started_at DESC LIMIT 20`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    // Get last step result per instance for SLA calculation
    const lastStepResults = await pool.query(
      `SELECT DISTINCT ON (wsr.instance_id) wsr.instance_id, wsr.completed_at
       FROM app.workflow_step_results wsr
       JOIN app.workflow_instances wi ON wi.id = wsr.instance_id
       WHERE wi.tenant_id = $1
       ORDER BY wsr.instance_id, wsr.completed_at DESC`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    const lastStepMap: Record<string, string> = {};
    for (const r of lastStepResults.rows) {
      lastStepMap[r['instance_id'] as string] = r['completed_at'] as string;
    }

    const recentActions = await pool.query(
      `SELECT wsr.instance_id, wd.name as definition_name, wsr.step_index, wsr.action,
              wsr.decision, wsr.completed_at, wsr.comments
       FROM app.workflow_step_results wsr
       JOIN app.workflow_instances wi ON wi.id = wsr.instance_id
       JOIN app.workflow_definitions wd ON wd.id = wi.definition_id
       WHERE wi.tenant_id = $1 ORDER BY wsr.completed_at DESC LIMIT 20`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    const activeCount = instances.rows.filter((i: Record<string, string>) => i['status'] === 'active').length;
    const pendingApprovals = instances.rows.filter((i: Record<string, string>) => i['status'] === 'active').length;

    await pool.end();

    return NextResponse.json({
      definitions: definitions.rows.map((r: Record<string, unknown>) => ({
        id: r['id'], name: r['name'], triggerType: r['trigger_type'],
        steps: r['steps'] || [], active: r['active'],
      })),
      instances: instances.rows.map((r: Record<string, unknown>) => {
        const steps = (r['definition_steps'] as Array<{ step: number; type: string; role: string }>) || [];
        const currentStepIndex = Math.max(0, (r['current_step'] as number) - 1);
        const currentStepDef = steps[currentStepIndex] || null;
        // SLA: time since last step result or since started_at
        const lastActionTime = lastStepMap[r['id'] as string];
        const stepStartedAt = lastActionTime || (r['started_at'] as string);
        return {
          id: r['id'], definitionName: r['definition_name'], entityType: r['trigger_entity_type'],
          entityId: r['trigger_entity_id'], currentStep: r['current_step'],
          totalSteps: Number(r['total_steps']) || 0, status: r['status'],
          startedAt: r['started_at'], definitionId: r['definition_id'],
          definitionSteps: steps,
          currentStepDef,
          stepStartedAt,
        };
      }),
      recentActions: recentActions.rows.map((r: Record<string, unknown>) => ({
        instanceId: r['instance_id'], definitionName: r['definition_name'],
        stepIndex: r['step_index'], action: r['action'], actorName: '',
        decision: r['decision'], completedAt: r['completed_at'],
        comments: r['comments'] || '',
      })),
      stats: { totalActive: activeCount, pendingApprovals, avgCompletionTime: '2.3 gun' },
    });
  } catch (error) {
    console.error('Workflows API error:', error);
    return NextResponse.json({ error: 'Is akisi verileri alinamadi', definitions: [], instances: [], recentActions: [], stats: { totalActive: 0, pendingApprovals: 0, avgCompletionTime: '-' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { definitionId, entityType, entityId, context } = body;
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });
    const result = await pool.query(
      `INSERT INTO app.workflow_instances (definition_id, tenant_id, trigger_entity_type, trigger_entity_id, context)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [definitionId, TENANT_ID, entityType, entityId, JSON.stringify(context || {})]
    );
    await pool.end();
    return NextResponse.json({ success: true, id: (result.rows[0] as Record<string, unknown>)?.['id'] });
  } catch (error) {
    console.error('Workflow create error:', error);
    return NextResponse.json({ error: 'Is akisi olusturulamadi' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { instanceId, decision, comments } = body as {
      instanceId: string;
      decision: 'approved' | 'rejected' | 'escalated';
      comments?: string;
    };

    if (!instanceId || !decision) {
      return NextResponse.json({ error: 'instanceId ve decision zorunludur' }, { status: 400 });
    }

    if (!['approved', 'rejected', 'escalated'].includes(decision)) {
      return NextResponse.json({ error: 'Gecersiz karar: approved, rejected veya escalated olmali' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });
    const actorId = DEV_HEADERS['X-User-Id'];

    // 1. Get current instance + definition
    const instanceResult = await pool.query(
      `SELECT wi.id, wi.current_step, wi.status, wi.definition_id, wi.started_at,
              wd.steps as definition_steps, wd.name as definition_name,
              jsonb_array_length(wd.steps) as total_steps
       FROM app.workflow_instances wi
       JOIN app.workflow_definitions wd ON wd.id = wi.definition_id
       WHERE wi.id = $1 AND wi.tenant_id = $2`,
      [instanceId, TENANT_ID]
    );

    if (instanceResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: 'Is akisi bulunamadi' }, { status: 404 });
    }

    const instance = instanceResult.rows[0] as Record<string, unknown>;

    if (instance['status'] !== 'active') {
      await pool.end();
      return NextResponse.json({ error: 'Bu is akisi artik aktif degil' }, { status: 400 });
    }

    const totalSteps = Number(instance['total_steps']);
    const currentStep = instance['current_step'] as number;
    const steps = (instance['definition_steps'] as Array<{ step: number; type: string; role: string }>) || [];
    const currentStepDef = steps[Math.max(0, currentStep - 1)];
    const stepAction = currentStepDef?.type || 'approval';

    // 2. INSERT into workflow_step_results
    await pool.query(
      `INSERT INTO app.workflow_step_results (instance_id, step_index, action, actor_id, decision, comments, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [instanceId, currentStep, stepAction, actorId, decision, comments || null]
    );

    // 3. Determine new status and step
    let newStatus: string;
    let newStep: number;

    if (decision === 'approved') {
      if (currentStep >= totalSteps) {
        // Last step approved -> completed
        newStatus = 'completed';
        newStep = currentStep;
      } else {
        // Advance to next step
        newStatus = 'active';
        newStep = currentStep + 1;
      }
    } else if (decision === 'rejected') {
      // Rejected -> cancelled
      newStatus = 'cancelled';
      newStep = currentStep;
    } else {
      // Escalated -> stays active, same step (for manual re-routing)
      newStatus = 'active';
      newStep = currentStep;
    }

    // 4. Update workflow_instances
    const completedAt = (newStatus === 'completed' || newStatus === 'cancelled') ? 'NOW()' : 'NULL';
    await pool.query(
      `UPDATE app.workflow_instances
       SET current_step = $1, status = $2, completed_at = ${completedAt}, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4`,
      [newStep, newStatus, instanceId, TENANT_ID]
    );

    // 5. Audit log
    await pool.query(
      `INSERT INTO app.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        TENANT_ID,
        actorId,
        `workflow_${decision}`,
        'workflow_instance',
        instanceId,
        JSON.stringify({
          definitionName: instance['definition_name'],
          step: currentStep,
          totalSteps,
          decision,
          comments: comments || null,
          newStatus,
        }),
      ]
    ).catch((err: Error) => {
      // Audit log failure should not block the main operation
      console.error('Audit log insert failed:', err.message);
    });

    await pool.end();

    return NextResponse.json({
      success: true,
      instanceId,
      decision,
      newStep,
      newStatus,
      message: decision === 'approved'
        ? (newStatus === 'completed' ? 'Is akisi tamamlandi' : `Adim ${currentStep} onaylandi, adim ${newStep} bekleniyor`)
        : decision === 'rejected'
          ? 'Is akisi reddedildi ve iptal edildi'
          : 'Eskalasyon yapildi',
    });
  } catch (error) {
    console.error('Workflow PATCH error:', error);
    return NextResponse.json({ error: 'Is akisi guncellenemedi' }, { status: 500 });
  }
}
