import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { computeDepartmentNorms, computeZScore, computeRoleFitScore } from '@/lib/scoring-engine';
import type { DomainScores } from '@/lib/scoring-engine';
import { createAuditLogger } from '@/lib/audit-logger';
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

    // Get employees with their strength profiles + performance data
    const result = await pool.query(
      `SELECT
         e.id as employee_id,
         e.ad as first_name,
         e.soyad as last_name,
         d.name_tr as department,
         sp.domain_scores,
         sp.top5,
         sp.shadow,
         sp.weaknesses,
         sp.role_fit_score,
         sp.updated_at as assessment_date,
         sa.completed_at,
         sa.version,
         pr.okr_score,
         pr.overall_score,
         pd.job_family,
         pd.jdr_talepler,
         pd.jdr_kaynaklar,
         pd.required_skills
       FROM app.employees e
       LEFT JOIN app.departments d ON d.id = e.department_id
       LEFT JOIN app.strength_profiles sp ON sp.employee_id = e.id AND sp.tenant_id = $1
       LEFT JOIN app.strengths_assessments sa ON sa.employee_id = e.id AND sa.tenant_id = $1
       LEFT JOIN app.performance_reviews pr ON pr.employee_id = e.id AND pr.tenant_id = $1
       LEFT JOIN app.position_definitions pd ON pd.id = e.position_id
       WHERE e.tenant_id = $1${filterClause}
       ORDER BY sp.role_fit_score DESC NULLS LAST, e.ad`,
      filterParams
    );

    // Compute real department norms from actual employee data
    const assessedEmployees = result.rows
      .filter((r) => r.domain_scores && Object.keys(r.domain_scores).length > 0)
      .map((r) => ({ domainScores: r.domain_scores as DomainScores }));
    const norms = computeDepartmentNorms(assessedEmployees);

    // Compute real fit scores for each employee using scoring engine
    const employees = result.rows.map((r) => {
      const domainScores = (r.domain_scores || {}) as DomainScores;
      let computedFitScore: number | null = null;
      let fitBreakdown = null;
      let percentiles: Record<string, { z: number; percentile: number }> | null = null;

      if (r.assessment_date && Object.keys(domainScores).length > 0) {
        // Compute role-fit using real algorithm
        const jdrProfile = (r.jdr_talepler && r.jdr_kaynaklar)
          ? { demands: r.jdr_talepler, resources: r.jdr_kaynaklar }
          : { demands: { workload: 60, time_pressure: 55 }, resources: { autonomy: 65, social_support: 60 } };

        const fitResult = computeRoleFitScore(
          {
            domainScores,
            okrScore: r.okr_score ? Number(r.okr_score) : undefined,
          },
          {
            requiredSkills: r.required_skills || [],
            jdrProfile,
          },
          r.job_family || 'default',
        );
        computedFitScore = fitResult.score;
        fitBreakdown = fitResult.breakdown;

        // Compute percentiles for each domain vs. peer group
        percentiles = {};
        for (const [domain, score] of Object.entries(domainScores)) {
          if (norms[domain]) {
            percentiles[domain] = computeZScore(score, norms[domain].mean, norms[domain].sd);
          }
        }
      }

      return {
        id: r.employee_id,
        name: `${r.first_name} ${r.last_name}`,
        department: r.department,
        domainScores,
        top5: r.top5,
        shadow: r.shadow,
        weaknesses: r.weaknesses,
        roleFitScore: computedFitScore ?? (r.role_fit_score ? Number(r.role_fit_score) : null),
        fitBreakdown,
        percentiles,
        assessmentDate: r.assessment_date,
        completedAt: r.completed_at,
      };
    });

    // Stats
    const total = employees.length;
    const assessed = employees.filter((e) => e.assessmentDate !== null).length;
    const avgFitScore =
      assessed > 0
        ? Math.round(
            employees
              .filter((e) => e.roleFitScore !== null)
              .reduce((sum, e) => sum + (e.roleFitScore ?? 0), 0) / assessed
          )
        : 0;

    await pool.end();

    return NextResponse.json({
      employees,
      stats: { total, assessed, pending: total - assessed, avgFitScore },
      norms, // real department norms computed from actual data
    });
  } catch (error) {
    console.error('Strengths API error:', error);
    return NextResponse.json(
      { error: 'Güçlü yön verileri alınamadı', employees: [], stats: { total: 0, assessed: 0, pending: 0, avgFitScore: 0 }, norms: {} },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, answers, domainScores, top5, shadow, weaknesses, roleFitScore } = body;

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Save assessment answers
    await pool.query(
      `INSERT INTO app.strengths_assessments (tenant_id, employee_id, completed_at, answers, version)
       VALUES ($1, $2, now(), $3, 'v1')`,
      [TENANT_ID, employeeId, JSON.stringify(answers)]
    );

    // Upsert strength profile
    await pool.query(
      `INSERT INTO app.strength_profiles (tenant_id, employee_id, domain_scores, top5, shadow, weaknesses, role_fit_score, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (employee_id) DO UPDATE SET
         domain_scores = EXCLUDED.domain_scores,
         top5 = EXCLUDED.top5,
         shadow = EXCLUDED.shadow,
         weaknesses = EXCLUDED.weaknesses,
         role_fit_score = EXCLUDED.role_fit_score,
         updated_at = now()`,
      [TENANT_ID, employeeId, JSON.stringify(domainScores), JSON.stringify(top5), JSON.stringify(shadow), JSON.stringify(weaknesses), roleFitScore]
    );

    await pool.end();

    // Fire-and-forget audit log
    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('create', 'strength_assessment', employeeId, undefined, { roleFitScore });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Strengths save error:', error);
    return NextResponse.json({ error: 'Değerlendirme kaydedilemedi' }, { status: 500 });
  }
}
