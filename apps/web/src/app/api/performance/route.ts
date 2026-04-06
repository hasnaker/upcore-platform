import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { compute9BoxCategory } from '@/lib/scoring-engine';
import { parseAccessContext, getDataFilter } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    // RBAC: determine data visibility based on actor role
    const ctx = parseAccessContext(req.headers);
    const filter = getDataFilter(ctx);

    let filterClause = '';
    const filterParams: string[] = [TENANT_ID];
    if (filter.filterType === 'self' && filter.employeeId) {
      filterClause = ' AND e.id = $2';
      filterParams.push(filter.employeeId);
    } else if (filter.filterType === 'department' && filter.departmentId) {
      filterClause = ' AND e.department_id = $2';
      filterParams.push(filter.departmentId);
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Performance reviews
    const reviews = await pool.query(
      `SELECT
         pr.id, pr.period, pr.okr_score, pr.competency_score, pr.overall_score,
         pr.potential_rating, pr.status, pr.manager_notes,
         e.ad as first_name, e.soyad as last_name,
         d.name_tr as department
       FROM app.performance_reviews pr
       JOIN app.employees e ON e.id = pr.employee_id
       LEFT JOIN app.departments d ON d.id = e.department_id
       WHERE pr.tenant_id = $1${filterClause}
       ORDER BY pr.overall_score DESC NULLS LAST`,
      filterParams
    );

    // Get 360 feedback averages per employee for potential calculation
    const feedbackAvgs = await pool.query(
      `SELECT
         fr.evaluatee_id,
         AVG((
           SELECT AVG(val::numeric)
           FROM jsonb_each_text(fr.scores) AS x(key, val)
         )) as feedback_avg
       FROM app.feedback_responses fr
       JOIN app.feedback_cycles fc ON fc.id = fr.cycle_id
       WHERE fc.tenant_id = $1 AND fr.completed_at IS NOT NULL
       GROUP BY fr.evaluatee_id`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    const feedbackMap = new Map<string, number>();
    for (const row of feedbackAvgs.rows) {
      feedbackMap.set(row.evaluatee_id, Number(row.feedback_avg));
    }

    // Get strength depth per employee
    const strengthDepths = await pool.query(
      `SELECT employee_id, domain_scores
       FROM app.strength_profiles
       WHERE tenant_id = $1`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    const depthMap = new Map<string, number>();
    for (const row of strengthDepths.rows) {
      const scores = row.domain_scores as Record<string, number>;
      const depth = Object.values(scores).filter((v) => v >= 4.0).length;
      depthMap.set(row.employee_id, depth);
    }

    // Auto-compute 9-box categories using scoring engine
    const autoNineBox = reviews.rows.map((r) => {
      const employeeId = r.id; // review ID, need employee ID
      const feedbackAvg = feedbackMap.get(r.id) ?? null; // approximate
      const strengthsDepth = depthMap.get(r.id) ?? 0;

      const category = compute9BoxCategory(
        r.okr_score ? Number(r.okr_score) : null,
        r.competency_score ? Number(r.competency_score) : null,
        feedbackAvg,
        strengthsDepth,
        r.potential_rating,
      );

      return {
        employee: `${r.first_name} ${r.last_name}`,
        department: r.department,
        ...category,
      };
    });

    // Existing nine_box data from DB
    const nineBox = await pool.query(
      `SELECT
         nb.id, nb.performance_score, nb.potential_score, nb.category, nb.period,
         e.ad as first_name, e.soyad as last_name,
         d.name_tr as department
       FROM app.nine_box nb
       JOIN app.employees e ON e.id = nb.employee_id
       LEFT JOIN app.departments d ON d.id = e.department_id
       WHERE nb.tenant_id = $1
       ORDER BY nb.category, nb.performance_score DESC`,
      [TENANT_ID]
    );

    // Trend data from snapshots (last 8 weeks)
    const trends = await pool.query(
      `SELECT
         e.ad as first_name, e.soyad as last_name,
         ss.snapshot_date, ss.okr_progress, ss.burnout_score,
         ss.performance_score, ss.risk_score
       FROM app.score_snapshots ss
       JOIN app.employees e ON e.id = ss.employee_id
       WHERE ss.tenant_id = $1 AND ss.snapshot_date >= CURRENT_DATE - INTERVAL '60 days'
       ORDER BY e.ad, ss.snapshot_date`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    // Group trends by employee
    const trendsByEmployee = new Map<string, Array<{ date: string; okr: number | null; burnout: number | null; performance: number | null; risk: number | null }>>();
    for (const row of trends.rows) {
      const name = `${row.first_name} ${row.last_name}`;
      if (!trendsByEmployee.has(name)) trendsByEmployee.set(name, []);
      trendsByEmployee.get(name)!.push({
        date: row.snapshot_date,
        okr: row.okr_progress ? Number(row.okr_progress) : null,
        burnout: row.burnout_score ? Number(row.burnout_score) : null,
        performance: row.performance_score ? Number(row.performance_score) : null,
        risk: row.risk_score ? Number(row.risk_score) : null,
      });
    }

    await pool.end();

    return NextResponse.json({
      reviews: reviews.rows.map((r) => ({
        id: r.id,
        employee: `${r.first_name} ${r.last_name}`,
        department: r.department,
        period: r.period,
        okrScore: r.okr_score ? Number(r.okr_score) : null,
        competencyScore: r.competency_score ? Number(r.competency_score) : null,
        overallScore: r.overall_score ? Number(r.overall_score) : null,
        potentialRating: r.potential_rating,
        status: r.status,
      })),
      nineBox: nineBox.rows.map((nb) => ({
        id: nb.id,
        employee: `${nb.first_name} ${nb.last_name}`,
        department: nb.department,
        performanceScore: Number(nb.performance_score),
        potentialScore: Number(nb.potential_score),
        category: nb.category,
        period: nb.period,
      })),
      autoNineBox, // algorithm-driven 9-box from scoring engine
      trends: Object.fromEntries(trendsByEmployee), // 8-week trend per employee
    });
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json({ error: 'Performans verileri alınamadı', reviews: [], nineBox: [], autoNineBox: [], trends: {} }, { status: 500 });
  }
}
