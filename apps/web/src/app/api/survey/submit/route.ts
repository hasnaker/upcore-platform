import { NextResponse } from 'next/server';

// Save BAT-12-TR survey results to burnout_signals table
const DB_URL = process.env['DATABASE_URL'] || 'postgresql://upcore:upcore_dev_password@localhost:5432/upcore_dev';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, subscales, total, level } = body;

    if (!subscales || total === undefined) {
      return NextResponse.json({ error: 'Eksik veri' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Use a default employee ID if not provided (anonymous survey)
    const empId = employeeId || '64731864-b6eb-4af9-9448-00bb5d9ae74b'; // Ayşe Yılmaz
    const tenantId = '11111111-1111-1111-1111-111111111111';

    // Insert burnout signals for each subscale + total
    const features = [
      { name: 'bat_exhaustion', value: subscales.exhaustion },
      { name: 'bat_mental_distance', value: subscales.mentalDistance },
      { name: 'bat_cognitive', value: subscales.cognitive },
      { name: 'bat_emotional', value: subscales.emotional },
      { name: 'bat_total', value: total },
    ];

    for (const feat of features) {
      await pool.query(
        `INSERT INTO app.burnout_signals (tenant_id, employee_id, ts, feature_name, feature_value, source, confidence, metadata)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, 'bat_12_tr', 0.95, $5)`,
        [tenantId, empId, feat.name, feat.value, JSON.stringify({ level, source: 'frontend_survey' })]
      );
    }

    await pool.end();

    return NextResponse.json({
      message: 'Anket sonuçları kaydedildi',
      saved: features.length,
      level,
    });
  } catch (error) {
    console.error('Survey submit error:', error);
    return NextResponse.json({ error: 'Kayıt başarısız', details: String(error) }, { status: 500 });
  }
}
