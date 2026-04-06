import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';
import { validateOkrPatch } from '@/lib/validation';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Get objectives with owner info
    const objectives = await pool.query(
      `SELECT
         o.id, o.level, o.title, o.progress, o.status, o.deadline,
         o.updated_at, o.parent_id, o.department_id,
         e.ad as owner_first_name, e.soyad as owner_last_name,
         d.name_tr as department_name
       FROM app.okr_objectives o
       LEFT JOIN app.employees e ON e.id = o.owner_id
       LEFT JOIN app.departments d ON d.id = o.department_id
       WHERE o.tenant_id = $1 AND o.status = 'active'
       ORDER BY o.level, o.created_at`,
      [TENANT_ID]
    );

    // Get all key results
    const keyResults = await pool.query(
      `SELECT kr.id, kr.objective_id, kr.title, kr.target_value, kr.current_value, kr.progress, kr.unit
       FROM app.okr_key_results kr
       JOIN app.okr_objectives o ON o.id = kr.objective_id
       WHERE o.tenant_id = $1
       ORDER BY kr.created_at`,
      [TENANT_ID]
    );

    await pool.end();

    // Group key results by objective
    const krByObjective = new Map<string, typeof keyResults.rows>();
    for (const kr of keyResults.rows) {
      const list = krByObjective.get(kr.objective_id) || [];
      list.push(kr);
      krByObjective.set(kr.objective_id, list);
    }

    const okrs = objectives.rows.map((o) => ({
      id: o.id,
      objective: o.title,
      progress: Number(o.progress),
      owner: o.owner_first_name ? `${o.owner_first_name} ${o.owner_last_name}` : 'Atanmamış',
      deadline: o.deadline,
      updatedAt: o.updated_at || undefined,
      level: o.level as 'company' | 'team' | 'individual',
      team: o.department_name || undefined,
      keyResults: (krByObjective.get(o.id) || []).map((kr) => ({
        id: kr.id,
        title: kr.title,
        progress: Number(kr.progress),
        target: kr.target_value ? `${kr.current_value}/${kr.target_value} ${kr.unit || ''}`.trim() : '',
      })),
    }));

    return NextResponse.json({ okrs });
  } catch (error) {
    console.error('OKR API error:', error);
    return NextResponse.json({ error: 'OKR verileri alınamadı', okrs: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { objective, owner, deadline, level, team, keyResults } = body;

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Find owner employee
    const ownerResult = await pool.query(
      `SELECT id FROM app.employees WHERE tenant_id = $1 AND CONCAT(ad, ' ', soyad) ILIKE $2 LIMIT 1`,
      [TENANT_ID, `%${owner}%`]
    );
    const ownerId = ownerResult.rows[0]?.id || null;

    // Find department if team level
    let departmentId = null;
    if (level === 'team' && team) {
      const deptResult = await pool.query(
        `SELECT id FROM app.departments WHERE tenant_id = $1 AND name_tr ILIKE $2 LIMIT 1`,
        [TENANT_ID, `%${team}%`]
      );
      departmentId = deptResult.rows[0]?.id || null;
    }

    // Insert objective
    const objResult = await pool.query(
      `INSERT INTO app.okr_objectives (tenant_id, level, title, owner_id, department_id, progress, status, deadline)
       VALUES ($1, $2, $3, $4, $5, 0, 'active', $6) RETURNING id`,
      [TENANT_ID, level, objective, ownerId, departmentId, deadline]
    );
    const objectiveId = objResult.rows[0].id;

    // Insert key results
    if (keyResults && Array.isArray(keyResults)) {
      for (const kr of keyResults) {
        if (kr.title) {
          await pool.query(
            `INSERT INTO app.okr_key_results (objective_id, title, progress) VALUES ($1, $2, 0)`,
            [objectiveId, kr.title]
          );
        }
      }
    }

    await pool.end();

    // Fire-and-forget audit log
    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('create', 'okr', objectiveId, undefined, { title: objective });

    return NextResponse.json({ success: true, id: objectiveId });
  } catch (error) {
    console.error('OKR create error:', error);
    return NextResponse.json({ error: 'OKR oluşturulamadı' }, { status: 500 });
  }
}

/**
 * PATCH — Update OKR progress (key result or objective level).
 * Auto-calculates objective progress from KR averages.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateOkrPatch(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Gecersiz veri', details: validation.errors }, { status: 400 });
    }
    const { keyResultId, objectiveId, progress } = validation.data!;

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    if (keyResultId) {
      // Update key result progress
      await pool.query(
        `UPDATE app.okr_key_results SET progress = $1 WHERE id = $2`,
        [progress, keyResultId]
      );

      // Auto-calculate parent objective progress from KR averages
      const parent = await pool.query(
        `SELECT objective_id FROM app.okr_key_results WHERE id = $1`,
        [keyResultId]
      );
      const parentId = parent.rows[0]?.objective_id;
      if (parentId) {
        await pool.query(
          `UPDATE app.okr_objectives SET progress = (
             SELECT ROUND(AVG(progress), 2) FROM app.okr_key_results WHERE objective_id = $1
           ), updated_at = now() WHERE id = $1`,
          [parentId]
        );
      }
    } else if (objectiveId) {
      // Direct objective progress update
      await pool.query(
        `UPDATE app.okr_objectives SET progress = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
        [progress, objectiveId, TENANT_ID]
      );
    }

    await pool.end();

    // Audit
    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'okr', keyResultId || objectiveId, {
      progress: { old: null, new: progress },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OKR update error:', error);
    return NextResponse.json({ error: 'OKR güncellenemedi' }, { status: 500 });
  }
}
