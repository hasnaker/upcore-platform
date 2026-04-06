import { NextResponse } from 'next/server';

const DB_URL = process.env['DATABASE_URL'] || 'postgresql://upcore:upcore_dev_password@localhost:5432/upcore_dev';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });
    const result = await pool.query(
      `SELECT id, code, title_tr, title_en, description_tr, category, evidence_tier, target_drivers, delivery_mode, expected_effect_size
       FROM app.interventions WHERE tenant_id = $1 ORDER BY evidence_tier, title_tr`,
      ['11111111-1111-1111-1111-111111111111']
    );
    await pool.end();
    return NextResponse.json({ items: result.rows, total: result.rowCount });
  } catch (error) {
    return NextResponse.json({ error: 'Müdahale verileri alınamadı', items: [] }, { status: 500 });
  }
}
