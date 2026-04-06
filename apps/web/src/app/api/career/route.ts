import { NextRequest, NextResponse } from 'next/server';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';
import { computeRoleFitScore } from '@/lib/scoring-engine';
import type { DomainScores } from '@/lib/scoring-engine';
import { createAuditLogger } from '@/lib/audit-logger';

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // Internal positions with department info and position definition details
    const positions = await pool.query(
      `SELECT
         ip.id, ip.title_tr as title, ip.status, ip.posted_at, ip.closes_at,
         d.name_tr as department,
         pd.seniority_min_years, pd.required_skills, pd.description_tr as description,
         pd.jdr_talepler, pd.jdr_kaynaklar,
         (SELECT count(*) FROM app.internal_applications ia WHERE ia.position_id = ip.id AND ia.tenant_id = $1) as application_count
       FROM app.internal_positions ip
       LEFT JOIN app.departments d ON d.id = ip.department_id
       LEFT JOIN app.position_definitions pd ON pd.id = ip.position_id
       WHERE ip.tenant_id = $1 AND ip.status = 'open' AND ip.deleted_at IS NULL
       ORDER BY ip.posted_at DESC`,
      [TENANT_ID]
    );

    // Career paths with position names
    const paths = await pool.query(
      `SELECT
         cp.id, cp.code, cp.name_tr, cp.description_tr, cp.avg_tenure_months,
         cp.required_skills, cp.skill_gaps, cp.development_actions,
         fp.title_tr as from_title, tp.title_tr as to_title
       FROM app.career_paths cp
       LEFT JOIN app.position_definitions fp ON fp.id = cp.from_position_id
       JOIN app.position_definitions tp ON tp.id = cp.to_position_id
       WHERE cp.tenant_id = $1 AND cp.active = true
       ORDER BY cp.name_tr`,
      [TENANT_ID]
    );

    // Job crafting suggestions
    const crafting = await pool.query(
      `SELECT
         jc.id, jc.crafting_type, jc.suggestion_tr, jc.rationale_tr, jc.status,
         e.ad as employee_first_name, e.soyad as employee_last_name
       FROM app.job_crafting_suggestions jc
       JOIN app.employees e ON e.id = jc.employee_id
       WHERE jc.tenant_id = $1
       ORDER BY jc.created_at DESC`,
      [TENANT_ID]
    );

    // Succession plans
    const succession = await pool.query(
      `SELECT
         sp.id, sp.readiness, sp.development_areas,
         pd.title_tr as position_title, pd.job_level,
         e.ad as candidate_first_name, e.soyad as candidate_last_name,
         d.name_tr as department
       FROM app.succession_plans sp
       JOIN app.position_definitions pd ON pd.id = sp.critical_position_id
       JOIN app.employees e ON e.id = sp.candidate_id
       LEFT JOIN app.departments d ON d.id = pd.department_id
       WHERE sp.tenant_id = $1
       ORDER BY pd.title_tr, sp.readiness`,
      [TENANT_ID]
    );

    // Get current user's profile for fit score computation
    // In production, use auth context. Dev: use first employee with a strength profile
    const currentUser = await pool.query(
      `SELECT sp.domain_scores, pr.okr_score, e.position_id
       FROM app.employees e
       JOIN app.strength_profiles sp ON sp.employee_id = e.id AND sp.tenant_id = $1
       LEFT JOIN app.performance_reviews pr ON pr.employee_id = e.id AND pr.tenant_id = $1
       WHERE e.tenant_id = $1
       ORDER BY sp.role_fit_score DESC NULLS LAST
       LIMIT 1`,
      [TENANT_ID]
    ).catch(() => ({ rows: [] }));

    const userProfile = currentUser.rows[0] || {};
    const userDomainScores = (userProfile.domain_scores || {}) as DomainScores;
    const userOkrScore = userProfile.okr_score ? Number(userProfile.okr_score) : undefined;

    await pool.end();

    return NextResponse.json({
      positions: positions.rows.map((p) => {
        // Compute REAL fit score using scoring engine
        const jdrProfile = (p.jdr_talepler && p.jdr_kaynaklar)
          ? { demands: p.jdr_talepler as Record<string, number>, resources: p.jdr_kaynaklar as Record<string, number> }
          : { demands: { workload: 60 }, resources: { autonomy: 60 } };

        const fitResult = Object.keys(userDomainScores).length > 0
          ? computeRoleFitScore(
              { domainScores: userDomainScores, okrScore: userOkrScore },
              { requiredSkills: p.required_skills || [], jdrProfile },
              'default',
            )
          : null;

        return {
          id: p.id,
          title: p.title,
          department: p.department,
          status: p.status,
          seniorityReq: p.seniority_min_years ? `${p.seniority_min_years}+ yıl` : null,
          description: p.description,
          requiredSkills: p.required_skills || [],
          jdrProfile: {
            demands: p.jdr_talepler ? Math.round((Object.values(p.jdr_talepler as Record<string, number>).reduce((a: number, b: number) => a + b, 0)) / Math.max(Object.keys(p.jdr_talepler as Record<string, number>).length, 1)) : 0,
            resources: p.jdr_kaynaklar ? Math.round((Object.values(p.jdr_kaynaklar as Record<string, number>).reduce((a: number, b: number) => a + b, 0)) / Math.max(Object.keys(p.jdr_kaynaklar as Record<string, number>).length, 1)) : 0,
          },
          fitScore: fitResult?.score ?? null,
          fitBreakdown: fitResult?.breakdown ?? null,
          fitInterpretation: fitResult?.interpretation ?? null,
          fitConfidence: fitResult?.confidence ?? null,
          applicationCount: Number(p.application_count),
          closesAt: p.closes_at,
        };
      }),
      paths: paths.rows.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name_tr,
        description: p.description_tr,
        fromTitle: p.from_title,
        toTitle: p.to_title,
        avgTenureMonths: p.avg_tenure_months,
        requiredSkills: p.required_skills,
        skillGaps: p.skill_gaps,
        developmentActions: p.development_actions,
      })),
      crafting: crafting.rows.map((c) => ({
        id: c.id,
        type: c.crafting_type,
        suggestion: c.suggestion_tr,
        rationale: c.rationale_tr,
        status: c.status,
        employee: `${c.employee_first_name} ${c.employee_last_name}`,
      })),
      succession: succession.rows.map((s) => ({
        id: s.id,
        position: s.position_title,
        jobLevel: s.job_level,
        department: s.department,
        candidate: `${s.candidate_first_name} ${s.candidate_last_name}`,
        readiness: s.readiness,
        developmentAreas: s.development_areas,
      })),
    });
  } catch (error) {
    console.error('Career API error:', error);
    return NextResponse.json(
      { error: 'Kariyer verileri alınamadı', positions: [], paths: [], crafting: [], succession: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { positionId, employeeId } = body;

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    await pool.query(
      `INSERT INTO app.internal_applications (tenant_id, employee_id, position_id, status, confidential, applied_at)
       VALUES ($1, $2, $3, 'applied', true, now())`,
      [TENANT_ID, employeeId, positionId]
    );

    await pool.end();

    // Fire-and-forget audit log
    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('create', 'internal_application', positionId, undefined, { employeeId, positionId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Career apply error:', error);
    return NextResponse.json({ error: 'Başvuru kaydedilemedi' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationId, status } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'applicationId ve status zorunludur' }, { status: 400 });
    }

    const validStatuses = ['reviewing', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Geçersiz status. Geçerli değerler: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query(
      `UPDATE app.internal_applications SET status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3 RETURNING id`,
      [status, applicationId, TENANT_ID]
    );

    await pool.end();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 });
    }

    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('update', 'internal_application', applicationId, undefined, { status });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Career PATCH error:', error);
    return NextResponse.json({ error: 'Başvuru durumu güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId zorunludur' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    const result = await pool.query(
      `DELETE FROM app.internal_applications WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [applicationId, TENANT_ID]
    );

    await pool.end();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 });
    }

    const actorId = req.headers.get('x-user-id') || 'anonymous';
    const actorRole = req.headers.get('x-user-role') || 'employee';
    const audit = createAuditLogger(actorId, actorRole);
    void audit.log('delete', 'internal_application', applicationId, undefined, { applicationId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Career DELETE error:', error);
    return NextResponse.json({ error: 'Başvuru silinemedi' }, { status: 500 });
  }
}
