import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Query AI predictions joined with employees and departments
    const result = await pool.query(`
      SELECT
        ap.id,
        ap.employee_id,
        e.ad || ' ' || e.soyad as name,
        COALESCE(d.name_tr, 'Genel') as department,
        ap.prediction_type,
        ap.probability,
        ap.confidence,
        ap.risk_factors,
        ap.recommended_actions,
        ap.predicted_at
      FROM app.ai_predictions ap
      JOIN app.employees e ON e.id = ap.employee_id AND e.tenant_id = ap.tenant_id
      LEFT JOIN app.departments d ON d.id = e.department_id
      WHERE ap.tenant_id = $1
      ORDER BY ap.predicted_at DESC
    `, [TENANT_ID]);

    // Group predictions by type and compute summary
    let highAttrition = 0;
    let mediumAttrition = 0;
    let lowAttrition = 0;
    let performanceSum = 0;
    let performanceCount = 0;
    let burnoutRiskCount = 0;
    let promotionReady = 0;

    const predictions = result.rows.map((row) => {
      const type = row.prediction_type as string;
      const probability = Number(row.probability);

      if (type === 'attrition') {
        if (probability >= 70) highAttrition++;
        else if (probability >= 40) mediumAttrition++;
        else lowAttrition++;
      }

      if (type === 'performance') {
        performanceSum += probability;
        performanceCount++;
      }

      if (type === 'burnout' && probability >= 50) {
        burnoutRiskCount++;
      }

      if (type === 'promotion' && probability >= 70) {
        promotionReady++;
      }

      return {
        employeeId: row.employee_id,
        name: row.name,
        department: row.department,
        type: row.prediction_type,
        probability,
        confidence: Number(row.confidence),
        riskFactors: row.risk_factors || [],
        recommendedActions: row.recommended_actions || [],
        predictedAt: row.predicted_at,
      };
    });

    await pool.end();

    return NextResponse.json({
      predictions,
      summary: {
        attritionRisk: {
          high: highAttrition,
          medium: mediumAttrition,
          low: lowAttrition,
        },
        avgPerformancePrediction: performanceCount > 0
          ? Math.round(performanceSum / performanceCount)
          : 0,
        burnoutRiskCount,
        promotionReady,
      },
    });
  } catch (error) {
    console.error('Predictions API error:', error);
    return NextResponse.json(
      { error: 'Tahmin verileri alinamadi', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Remove/dismiss a prediction by ID.
 */
export async function DELETE(req: NextRequest) {
  try {
    const predictionId = req.nextUrl.searchParams.get('predictionId');
    if (!predictionId) {
      return NextResponse.json({ error: 'predictionId parametresi gerekli' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query(
      `DELETE FROM app.ai_predictions WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [predictionId, TENANT_ID]
    );

    await pool.end();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Tahmin bulunamadı' }, { status: 404 });
    }

    // Audit
    const actorId = req.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000001';
    const actorRole = req.headers.get('x-user-role') || 'hr_director';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('delete', 'ai_prediction', predictionId);

    return NextResponse.json({ success: true, predictionId });
  } catch (error) {
    console.error('Prediction delete error:', error);
    return NextResponse.json({ error: 'Tahmin silinemedi' }, { status: 500 });
  }
}
