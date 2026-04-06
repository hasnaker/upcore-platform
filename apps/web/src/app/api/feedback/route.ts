import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';
import { validateFeedbackSubmit } from '@/lib/validation';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Active feedback cycles
    const cycles = await pool.query(
      `SELECT id, name, cycle_type, status, deadline FROM app.feedback_cycles
       WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [TENANT_ID]
    );

    // Feedback responses with evaluator/evaluatee info
    const responses = await pool.query(
      `SELECT
         fr.id, fr.cycle_id, fr.relationship, fr.scores, fr.comments, fr.completed_at,
         ev.ad as evaluator_first_name, ev.soyad as evaluator_last_name,
         ee.ad as evaluatee_first_name, ee.soyad as evaluatee_last_name
       FROM app.feedback_responses fr
       JOIN app.feedback_cycles fc ON fc.id = fr.cycle_id
       JOIN app.employees ev ON ev.id = fr.evaluator_id
       JOIN app.employees ee ON ee.id = fr.evaluatee_id
       WHERE fc.tenant_id = $1
       ORDER BY fr.completed_at DESC NULLS LAST`,
      [TENANT_ID]
    );

    // Aggregate 360 scores per evaluatee
    const aggregated = new Map<string, { name: string; scores: Record<string, number[]>; responseCount: number }>();
    for (const r of responses.rows) {
      const key = `${r.evaluatee_first_name} ${r.evaluatee_last_name}`;
      if (!aggregated.has(key)) {
        aggregated.set(key, { name: key, scores: {}, responseCount: 0 });
      }
      const agg = aggregated.get(key)!;
      agg.responseCount++;
      if (r.scores && typeof r.scores === 'object') {
        for (const [dim, val] of Object.entries(r.scores as Record<string, number>)) {
          if (!agg.scores[dim]) agg.scores[dim] = [];
          agg.scores[dim].push(val);
        }
      }
    }

    const summaries = Array.from(aggregated.values()).map((agg) => ({
      name: agg.name,
      responseCount: agg.responseCount,
      avgScores: Object.fromEntries(
        Object.entries(agg.scores).map(([dim, vals]) => [
          dim,
          Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
        ])
      ),
    }));

    await pool.end();

    return NextResponse.json({
      cycles: cycles.rows,
      responses: responses.rows.map((r) => ({
        id: r.id,
        cycleId: r.cycle_id,
        evaluator: `${r.evaluator_first_name} ${r.evaluator_last_name}`,
        evaluatee: `${r.evaluatee_first_name} ${r.evaluatee_last_name}`,
        relationship: r.relationship,
        scores: r.scores,
        comments: r.comments,
        completedAt: r.completed_at,
      })),
      summaries,
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: '360° verileri alınamadı', cycles: [], responses: [], summaries: [] }, { status: 500 });
  }
}

/**
 * POST — Submit a 360° feedback response.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateFeedbackSubmit(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Gecersiz veri', details: validation.errors }, { status: 400 });
    }
    const { cycleId, evaluatorId, evaluateeId, relationship, scores, comments } = validation.data!;

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query(
      `INSERT INTO app.feedback_responses (cycle_id, evaluator_id, evaluatee_id, relationship, scores, comments, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       RETURNING id`,
      [cycleId, evaluatorId, evaluateeId, relationship, JSON.stringify(scores), comments || null]
    );

    await pool.end();

    // Audit
    const actorId = req.headers.get('x-user-id') || evaluatorId;
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('create', 'feedback_response', result.rows[0]?.id, undefined, {
      cycleId, evaluateeId, relationship,
    });

    return NextResponse.json({ success: true, id: result.rows[0]?.id });
  } catch (error) {
    console.error('Feedback submit error:', error);
    return NextResponse.json({ error: 'Geri bildirim kaydedilemedi' }, { status: 500 });
  }
}
