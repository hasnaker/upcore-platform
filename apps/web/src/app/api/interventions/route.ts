import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });
    const result = await pool.query(
      `SELECT id, code, title_tr, title_en, description_tr, category, evidence_tier, target_drivers, delivery_mode, expected_effect_size
       FROM app.interventions WHERE tenant_id = $1 ORDER BY evidence_tier, title_tr`,
      [TENANT_ID]
    );
    await pool.end();
    return NextResponse.json({ items: result.rows, total: result.rowCount });
  } catch (error) {
    return NextResponse.json({ error: 'Müdahale verileri alınamadı', items: [] }, { status: 500 });
  }
}

/**
 * POST — Assign an intervention to an employee.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { interventionId, employeeId, notes } = body as {
      interventionId: string;
      employeeId: string;
      notes?: string;
    };

    if (!interventionId || !employeeId) {
      return NextResponse.json({ error: 'interventionId ve employeeId gerekli' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query(
      `INSERT INTO app.intervention_assignments (tenant_id, intervention_id, employee_id, assigned_at, status, notes)
       VALUES ($1, $2, $3, now(), 'assigned', $4)
       RETURNING id`,
      [TENANT_ID, interventionId, employeeId, notes || null]
    );

    await pool.end();

    // Audit
    const actorId = req.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000001';
    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('create', 'intervention_assignment', result.rows[0]?.id, undefined, {
      interventionId, employeeId,
    });

    return NextResponse.json({ success: true, id: result.rows[0]?.id });
  } catch (error) {
    console.error('Intervention assignment error:', error);
    return NextResponse.json({ error: 'Müdahale ataması yapılamadı' }, { status: 500 });
  }
}

/**
 * PATCH — Update intervention assignment status.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentId, status, outcome } = body as {
      assignmentId: string;
      status: 'in_progress' | 'completed' | 'cancelled';
      outcome?: string;
    };

    if (!assignmentId || !status) {
      return NextResponse.json({ error: 'assignmentId ve status gerekli' }, { status: 400 });
    }

    const validStatuses = ['in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Geçersiz status: ${status}` }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    await pool.query(
      `UPDATE app.intervention_assignments SET status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
      [status, assignmentId, TENANT_ID]
    );

    // If completed, insert outcome record
    if (status === 'completed' && outcome) {
      await pool.query(
        `INSERT INTO app.intervention_outcomes (tenant_id, assignment_id, outcome, recorded_at)
         VALUES ($1, $2, $3, now())`,
        [TENANT_ID, assignmentId, outcome]
      );
    }

    await pool.end();

    // Audit
    const actorId = req.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000001';
    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'intervention_assignment', assignmentId, {
      status: { old: 'unknown', new: status },
    });

    return NextResponse.json({ success: true, assignmentId, status });
  } catch (error) {
    console.error('Intervention assignment update error:', error);
    return NextResponse.json({ error: 'Müdahale ataması güncellenemedi' }, { status: 500 });
  }
}
