import { NextResponse } from 'next/server';
import { SERVICES, DB_URL, TENANT_ID } from '@/lib/service-urls';

// Save BAT-12-TR survey results:
// 1. Score via Python psychometric-scoring service (if available)
// 2. Save to burnout_signals table

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, subscales, total, level, rawResponses } = body;

    if (!subscales || total === undefined) {
      return NextResponse.json({ error: 'Eksik veri' }, { status: 400 });
    }

    // Also score via backend ML service (non-blocking)
    if (rawResponses && Array.isArray(rawResponses)) {
      try {
        const bat_responses: Record<string, number> = {};
        rawResponses.forEach((val: number, idx: number) => {
          bat_responses[`bat_${String(idx + 1).padStart(2, '0')}`] = val;
        });
        await fetch(`${SERVICES.scoring}/v1/score/bat12`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: TENANT_ID,
            employee_id: employeeId || '64731864-b6eb-4af9-9448-00bb5d9ae74b',
            assessment_id: '00000000-0000-0000-0000-000000000000',
            responses: bat_responses,
          }),
        });
      } catch {
        // Non-blocking — DB save is primary
      }
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Use a default employee ID if not provided (anonymous survey)
    const empId = employeeId || '64731864-b6eb-4af9-9448-00bb5d9ae74b'; // Ayşe Yılmaz
    const tenantId = TENANT_ID;

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
