import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';
import { validateNineBoxPatch } from '@/lib/validation';

/**
 * Nine-Box API — persist drag-drop reassignments and calibration changes.
 *
 * PATCH: Update employee's 9-box category
 * POST: Bulk calibration save (multiple employees at once)
 */

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateNineBoxPatch(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Gecersiz veri', details: validation.errors }, { status: 400 });
    }
    const { employeeId, performanceScore, potentialScore, category } = validation.data!;

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Upsert nine_box entry
    const result = await pool.query(
      `UPDATE app.nine_box
       SET performance_score = COALESCE($2, performance_score),
           potential_score = COALESCE($3, potential_score),
           category = COALESCE($4, category),
           updated_at = now()
       WHERE tenant_id = $1 AND employee_id = $5
       RETURNING id`,
      [TENANT_ID, performanceScore, potentialScore, category, employeeId]
    );

    if (result.rowCount === 0) {
      // Insert if not exists
      await pool.query(
        `INSERT INTO app.nine_box (tenant_id, employee_id, performance_score, potential_score, category, period)
         VALUES ($1, $2, $3, $4, $5, '2026-H1')`,
        [TENANT_ID, employeeId, performanceScore ?? 50, potentialScore ?? 50, category ?? 'solid']
      );
    }

    await pool.end();

    // Audit log
    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'nine_box', employeeId, {
      performance_score: { old: null, new: performanceScore },
      potential_score: { old: null, new: potentialScore },
      category: { old: null, new: category },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Nine-box update error:', error);
    return NextResponse.json({ error: '9-Box güncellenemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { updates } = body as { updates: Array<{ employeeId: string; performanceScore: number; potentialScore: number; category: string }> };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates array zorunlu' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    let updated = 0;
    for (const u of updates) {
      const result = await pool.query(
        `UPDATE app.nine_box
         SET performance_score = $2, potential_score = $3, category = $4, updated_at = now()
         WHERE tenant_id = $1 AND employee_id = $5`,
        [TENANT_ID, u.performanceScore, u.potentialScore, u.category, u.employeeId]
      );
      updated += result.rowCount ?? 0;
    }

    await pool.end();

    // Audit
    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'nine_box_calibration', undefined, undefined, { count: updates.length });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('Nine-box calibration error:', error);
    return NextResponse.json({ error: 'Kalibrasyon kaydedilemedi' }, { status: 500 });
  }
}
