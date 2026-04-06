import { NextResponse } from 'next/server';

const DB_URL = process.env['DATABASE_URL'] || 'postgresql://upcore:upcore_dev_password@localhost:5432/upcore_dev';
const TENANT = '11111111-1111-1111-1111-111111111111';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Get open positions
    const positions = await pool.query(
      `SELECT id, title_tr as title, department_id, status, headcount, work_location, created_at FROM app.open_positions WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [TENANT]
    ).catch(() => ({ rows: [] }));

    // Get candidates
    const candidates = await pool.query(
      `SELECT id, first_name, last_name, email, source, current_title, years_experience, created_at FROM app.candidates WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [TENANT]
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
      [TENANT]
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
