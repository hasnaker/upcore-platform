import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Get open positions
    const positions = await pool.query(
      `SELECT id, title_tr as title, department_id, status, headcount, work_location, created_at FROM app.open_positions WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    // Get candidates
    const candidates = await pool.query(
      `SELECT id, first_name, last_name, email, source, current_title, years_experience, created_at FROM app.candidates WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    // Get applications with pipeline stage + candidate info
    const applications = await pool.query(
      `SELECT a.id, a.candidate_id, a.open_position_id, a.stage, a.fit_score, a.applied_at,
              c.first_name, c.last_name, c.email, c.current_title,
              p.title_tr as position_title
       FROM app.applications a
       JOIN app.candidates c ON c.id = a.candidate_id
       JOIN app.open_positions p ON p.id = a.open_position_id
       WHERE a.tenant_id = $1
       ORDER BY a.fit_score DESC NULLS LAST LIMIT 30`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    await pool.end();

    return NextResponse.json({
      positions: positions.rows,
      candidates: candidates.rows,
      applications: applications.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: 'ATS verileri alınamadı', positions: [], candidates: [], applications: [] }, { status: 500 });
  }
}

/**
 * PATCH — Update application stage (and optionally fit score).
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationId, stage, fitScore } = body as {
      applicationId: string;
      stage: 'basvuru' | 'on-eleme' | 'mulakat' | 'teklif' | 'ise-alim';
      fitScore?: number;
    };

    if (!applicationId || !stage) {
      return NextResponse.json({ error: 'applicationId ve stage gerekli' }, { status: 400 });
    }

    const validStages = ['basvuru', 'on-eleme', 'mulakat', 'teklif', 'ise-alim'];
    if (!validStages.includes(stage)) {
      return NextResponse.json({ error: `Geçersiz stage: ${stage}` }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query(
      `UPDATE app.applications SET stage = $1, fit_score = COALESCE($2, fit_score), updated_at = now()
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, stage, fit_score`,
      [stage, fitScore ?? null, applicationId, TENANT_ID]
    );

    await pool.end();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 });
    }

    // Audit
    const actorId = req.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000001';
    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'application', applicationId, {
      stage: { old: 'unknown', new: stage },
    });

    return NextResponse.json({ success: true, application: result.rows[0] });
  } catch (error) {
    console.error('ATS application update error:', error);
    return NextResponse.json({ error: 'Başvuru güncellenemedi' }, { status: 500 });
  }
}
