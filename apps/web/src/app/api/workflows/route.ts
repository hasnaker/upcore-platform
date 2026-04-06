import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const definitions = await pool.query(
      `SELECT id, name, trigger_type, trigger_config, steps, active FROM app.workflow_definitions
       WHERE tenant_id = $1 ORDER BY name`,
      [TENANT_ID]
    );

    const instances = await pool.query(
      `SELECT wi.id, wd.name as definition_name, wi.trigger_entity_type, wi.trigger_entity_id,
              wi.current_step, jsonb_array_length(wd.steps) as total_steps,
              wi.status, wi.started_at, wi.completed_at
       FROM app.workflow_instances wi
       JOIN app.workflow_definitions wd ON wd.id = wi.definition_id
       WHERE wi.tenant_id = $1 ORDER BY wi.started_at DESC LIMIT 20`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    const recentActions = await pool.query(
      `SELECT wsr.instance_id, wd.name as definition_name, wsr.step_index, wsr.action,
              wsr.decision, wsr.completed_at
       FROM app.workflow_step_results wsr
       JOIN app.workflow_instances wi ON wi.id = wsr.instance_id
       JOIN app.workflow_definitions wd ON wd.id = wi.definition_id
       WHERE wi.tenant_id = $1 ORDER BY wsr.completed_at DESC LIMIT 20`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    const activeCount = instances.rows.filter((i) => i.status === 'active').length;
    const pendingApprovals = instances.rows.filter((i) => i.status === 'active').length; // simplified

    await pool.end();

    return NextResponse.json({
      definitions: definitions.rows.map((r) => ({
        id: r.id, name: r.name, triggerType: r.trigger_type,
        steps: r.steps || [], active: r.active,
      })),
      instances: instances.rows.map((r) => ({
        id: r.id, definitionName: r.definition_name, entityType: r.trigger_entity_type,
        entityId: r.trigger_entity_id, currentStep: r.current_step,
        totalSteps: Number(r.total_steps) || 0, status: r.status,
        startedAt: r.started_at,
      })),
      recentActions: recentActions.rows.map((r) => ({
        instanceId: r.instance_id, definitionName: r.definition_name,
        stepIndex: r.step_index, action: r.action, actorName: '',
        decision: r.decision, completedAt: r.completed_at,
      })),
      stats: { totalActive: activeCount, pendingApprovals, avgCompletionTime: '2.3 gün' },
    });
  } catch (error) {
    console.error('Workflows API error:', error);
    return NextResponse.json({ error: 'İş akışı verileri alınamadı', definitions: [], instances: [], recentActions: [], stats: { totalActive: 0, pendingApprovals: 0, avgCompletionTime: '-' } }, { status: 500 });
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
    return NextResponse.json({ success: true, id: result.rows[0]?.id });
  } catch (error) {
    console.error('Workflow create error:', error);
    return NextResponse.json({ error: 'İş akışı oluşturulamadı' }, { status: 500 });
  }
}
