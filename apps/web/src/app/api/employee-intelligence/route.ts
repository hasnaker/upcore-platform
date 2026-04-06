import { NextResponse } from 'next/server';
import { computeEmployeeRisk, compute9BoxCategory } from '@/lib/scoring-engine';
import type { RiskScore } from '@/lib/scoring-engine';
import { DB_URL, TENANT_ID } from '@/lib/service-urls';

// ─── Types ───

interface EmployeeRow {
  id: string;
  ad: string;
  soyad: string;
  department_name: string | null;
}

interface PerformanceRow {
  employee_id: string;
  okr_score: string | null;
  competency_score: string | null;
  overall_score: string | null;
  potential_rating: string | null;
}

interface BurnoutRow {
  employee_id: string;
  exhaustion_mean: string | null;
  disengagement_mean: string | null;
  overall_mean: string | null;
  bat_total: string | null;
}

interface NineBoxRow {
  employee_id: string;
  category: string;
  performance_score: string;
  potential_score: string;
}

interface StrengthRow {
  employee_id: string;
  domain_scores: Record<string, number> | null;
  top5: string[] | null;
}

interface FeedbackAggRow {
  evaluatee_id: string;
  avg_score: string;
}

interface OkrRow {
  owner_id: string;
  avg_progress: string;
}

interface EmployeeSynthesis {
  id: string;
  name: string;
  department: string;
  synthesis: {
    riskScore: RiskScore;
    nineBox: {
      performance: 'low' | 'medium' | 'high';
      potential: 'low' | 'medium' | 'high';
      performanceScore: number;
      potentialScore: number;
    };
    okrProgress: number | null;
    burnoutScore: number | null;
    feedbackAvg: number | null;
    strengthsDepth: number;
    overallHealth: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
  };
}

interface SummaryResponse {
  totalEmployees: number;
  criticalRisk: number;
  highRisk: number;
  avgOkrProgress: number | null;
  avgBurnout: number | null;
  nineBoxDistribution: Record<string, number>;
}

// ─── Helpers ───

function toNum(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function determineOverallHealth(
  riskLevel: RiskScore['level'],
  burnout: number | null,
  okr: number | null,
  feedback: number | null,
): 'critical' | 'poor' | 'fair' | 'good' | 'excellent' {
  // Critical risk always maps to critical/poor
  if (riskLevel === 'critical') return 'critical';
  if (riskLevel === 'high') return 'poor';

  // Count positive signals
  let positiveSignals = 0;
  let totalSignals = 0;

  if (burnout !== null) {
    totalSignals++;
    if (burnout <= 2.0) positiveSignals++;
  }
  if (okr !== null) {
    totalSignals++;
    if (okr >= 70) positiveSignals++;
  }
  if (feedback !== null) {
    totalSignals++;
    if (feedback >= 4.0) positiveSignals++;
  }

  if (totalSignals === 0) return 'fair'; // no data = neutral
  const ratio = positiveSignals / totalSignals;
  if (ratio >= 0.8) return 'excellent';
  if (ratio >= 0.5) return 'good';
  return 'fair';
}

function mapNineBoxToDistributionKey(
  performance: 'low' | 'medium' | 'high',
  potential: 'low' | 'medium' | 'high',
): string {
  if (performance === 'high' && potential === 'high') return 'star';
  if (performance === 'high' && potential === 'medium') return 'solid';
  if (performance === 'medium' && potential === 'high') return 'growth';
  if (performance === 'medium' && potential === 'medium') return 'average';
  if (performance === 'high' && potential === 'low') return 'solid';
  if (performance === 'low' && potential === 'high') return 'growth';
  return 'risk';
}

// ─── GET handler ───

export async function GET() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DB_URL });

    // ── 1. Employees + departments ──
    const employeesQuery = pool.query<EmployeeRow>(
      `SELECT
         e.id, e.ad, e.soyad,
         d.name_tr AS department_name
       FROM app.employees e
       LEFT JOIN app.departments d ON d.id = e.department_id
       WHERE e.tenant_id = $1 AND e.employment_status = 'active'
       ORDER BY e.ad, e.soyad`,
      [TENANT_ID],
    );

    // ── 2. Performance reviews (latest per employee) ──
    const performanceQuery = pool.query<PerformanceRow>(
      `SELECT DISTINCT ON (pr.employee_id)
         pr.employee_id, pr.okr_score, pr.competency_score,
         pr.overall_score, pr.potential_rating
       FROM app.performance_reviews pr
       WHERE pr.tenant_id = $1
       ORDER BY pr.employee_id, pr.created_at DESC`,
      [TENANT_ID],
    ).catch(() => ({ rows: [] as PerformanceRow[] }));

    // ── 3. Burnout signals (latest BAT scores per employee) ──
    // The burnout_signals table uses feature_name/feature_value pattern (per heatmap route)
    // Try to get bat_total, exhaustion, disengagement as separate features
    const burnoutQuery = pool.query<BurnoutRow>(
      `SELECT
         bs.employee_id,
         MAX(CASE WHEN bs.feature_name = 'bat_exhaustion' THEN bs.feature_value END) AS exhaustion_mean,
         MAX(CASE WHEN bs.feature_name = 'bat_disengagement' THEN bs.feature_value END) AS disengagement_mean,
         MAX(CASE WHEN bs.feature_name = 'bat_total' THEN bs.feature_value END) AS overall_mean,
         MAX(CASE WHEN bs.feature_name = 'bat_total' THEN bs.feature_value END) AS bat_total
       FROM app.burnout_signals bs
       WHERE bs.tenant_id = $1
         AND bs.feature_name IN ('bat_total', 'bat_exhaustion', 'bat_disengagement')
         AND bs.ts = (
           SELECT MAX(bs2.ts)
           FROM app.burnout_signals bs2
           WHERE bs2.employee_id = bs.employee_id
             AND bs2.feature_name = 'bat_total'
         )
       GROUP BY bs.employee_id`,
      [TENANT_ID],
    ).catch(() => ({ rows: [] as BurnoutRow[] }));

    // ── 4. Nine-box current categories ──
    const nineBoxQuery = pool.query<NineBoxRow>(
      `SELECT DISTINCT ON (nb.employee_id)
         nb.employee_id, nb.category, nb.performance_score, nb.potential_score
       FROM app.nine_box nb
       WHERE nb.tenant_id = $1
       ORDER BY nb.employee_id, nb.created_at DESC`,
      [TENANT_ID],
    ).catch(() => ({ rows: [] as NineBoxRow[] }));

    // ── 5. Strength profiles ──
    const strengthsQuery = pool.query<StrengthRow>(
      `SELECT employee_id, domain_scores, top5
       FROM app.strength_profiles
       WHERE tenant_id = $1`,
      [TENANT_ID],
    ).catch(() => ({ rows: [] as StrengthRow[] }));

    // ── 6. Feedback average per evaluatee ──
    const feedbackQuery = pool.query<FeedbackAggRow>(
      `SELECT
         fr.evaluatee_id,
         ROUND(AVG(val.score)::numeric, 2) AS avg_score
       FROM app.feedback_responses fr
       JOIN app.feedback_cycles fc ON fc.id = fr.cycle_id
       CROSS JOIN LATERAL (
         SELECT (v.value)::numeric AS score
         FROM jsonb_each_text(fr.scores::jsonb) AS v
         WHERE (v.value)::numeric IS NOT NULL
       ) val
       WHERE fc.tenant_id = $1 AND fr.completed_at IS NOT NULL
       GROUP BY fr.evaluatee_id`,
      [TENANT_ID],
    ).catch(() => ({ rows: [] as FeedbackAggRow[] }));

    // ── 7. OKR progress (active objectives, avg per owner) ──
    const okrQuery = pool.query<OkrRow>(
      `SELECT
         o.owner_id,
         ROUND(AVG(o.progress)::numeric, 1) AS avg_progress
       FROM app.okr_objectives o
       WHERE o.tenant_id = $1 AND o.status = 'active' AND o.owner_id IS NOT NULL
       GROUP BY o.owner_id`,
      [TENANT_ID],
    ).catch(() => ({ rows: [] as OkrRow[] }));

    // ── Execute all queries in parallel ──
    const [
      employeesResult,
      performanceResult,
      burnoutResult,
      nineBoxResult,
      strengthsResult,
      feedbackResult,
      okrResult,
    ] = await Promise.all([
      employeesQuery,
      performanceQuery,
      burnoutQuery,
      nineBoxQuery,
      strengthsQuery,
      feedbackQuery,
      okrQuery,
    ]);

    await pool.end();

    // ── Build lookup maps ──
    const performanceMap = new Map<string, PerformanceRow>();
    for (const row of performanceResult.rows) {
      performanceMap.set(row.employee_id, row);
    }

    const burnoutMap = new Map<string, BurnoutRow>();
    for (const row of burnoutResult.rows) {
      burnoutMap.set(row.employee_id, row);
    }

    const nineBoxMap = new Map<string, NineBoxRow>();
    for (const row of nineBoxResult.rows) {
      nineBoxMap.set(row.employee_id, row);
    }

    const strengthsMap = new Map<string, StrengthRow>();
    for (const row of strengthsResult.rows) {
      strengthsMap.set(row.employee_id, row);
    }

    const feedbackMap = new Map<string, number>();
    for (const row of feedbackResult.rows) {
      feedbackMap.set(row.evaluatee_id, Number(row.avg_score));
    }

    const okrMap = new Map<string, number>();
    for (const row of okrResult.rows) {
      okrMap.set(row.owner_id, Number(row.avg_progress));
    }

    // ── Compute peer burnout average for deviation calculation ──
    const allBurnoutScores = burnoutResult.rows
      .map((r) => toNum(r.overall_mean ?? r.bat_total))
      .filter((v): v is number => v !== null);
    const peerBurnoutAvg = allBurnoutScores.length > 0
      ? allBurnoutScores.reduce((a, b) => a + b, 0) / allBurnoutScores.length
      : undefined;

    // ── Synthesize per employee ──
    const nineBoxDistribution: Record<string, number> = {
      star: 0,
      growth: 0,
      solid: 0,
      average: 0,
      risk: 0,
    };

    let totalOkr = 0;
    let okrCount = 0;
    let totalBurnout = 0;
    let burnoutCount = 0;
    let criticalRisk = 0;
    let highRisk = 0;

    const employees: EmployeeSynthesis[] = employeesResult.rows.map((emp) => {
      const perf = performanceMap.get(emp.id);
      const burnout = burnoutMap.get(emp.id);
      const strengths = strengthsMap.get(emp.id);
      const feedbackAvg = feedbackMap.get(emp.id) ?? null;
      const okrProgress = okrMap.get(emp.id) ?? null;

      // Extract scores
      const okrScore = toNum(perf?.okr_score) ?? (okrProgress !== null ? okrProgress : null);
      const competencyScore = toNum(perf?.competency_score);
      const potentialRating = perf?.potential_rating ?? null;
      const burnoutScore = toNum(burnout?.overall_mean ?? burnout?.bat_total) ?? null;

      // Strengths depth: count domains with score >= 4.0
      const domainScores = strengths?.domain_scores ?? {};
      const strengthsDepth = Object.values(domainScores).filter((s) => s >= 4.0).length;

      // ── Risk score ──
      const riskScore = computeEmployeeRisk(
        {
          domainScores,
          okrScore: okrScore ?? undefined,
          feedbackAvg: feedbackAvg ?? undefined,
          burnoutScore: burnoutScore ?? undefined,
        },
        peerBurnoutAvg,
      );

      // ── 9-box auto-categorization ──
      const nineBox = compute9BoxCategory(
        okrScore,
        competencyScore,
        feedbackAvg,
        strengthsDepth,
        potentialRating,
      );

      // ── Overall health ──
      const overallHealth = determineOverallHealth(riskScore.level, burnoutScore, okrProgress, feedbackAvg);

      // ── Aggregate stats ──
      if (riskScore.level === 'critical') criticalRisk++;
      if (riskScore.level === 'high') highRisk++;

      if (okrProgress !== null) {
        totalOkr += okrProgress;
        okrCount++;
      }
      if (burnoutScore !== null) {
        totalBurnout += burnoutScore;
        burnoutCount++;
      }

      const distKey = mapNineBoxToDistributionKey(nineBox.performance, nineBox.potential);
      nineBoxDistribution[distKey] = (nineBoxDistribution[distKey] ?? 0) + 1;

      return {
        id: emp.id,
        name: `${emp.ad} ${emp.soyad}`.trim(),
        department: emp.department_name ?? 'Atanmamis',
        synthesis: {
          riskScore,
          nineBox,
          okrProgress,
          burnoutScore: burnoutScore !== null ? Math.round(burnoutScore * 100) / 100 : null,
          feedbackAvg: feedbackAvg !== null ? Math.round(feedbackAvg * 10) / 10 : null,
          strengthsDepth,
          overallHealth,
        },
      };
    });

    // ── Build summary ──
    const summary: SummaryResponse = {
      totalEmployees: employees.length,
      criticalRisk,
      highRisk,
      avgOkrProgress: okrCount > 0 ? Math.round(totalOkr / okrCount) : null,
      avgBurnout: burnoutCount > 0 ? Math.round((totalBurnout / burnoutCount) * 100) / 100 : null,
      nineBoxDistribution,
    };

    return NextResponse.json({ employees, summary });
  } catch (error: unknown) {
    console.error('Employee Intelligence API error:', error);
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json(
      {
        error: 'Calisan zeka verileri alinamadi',
        details: message,
        employees: [],
        summary: {
          totalEmployees: 0,
          criticalRisk: 0,
          highRisk: 0,
          avgOkrProgress: null,
          avgBurnout: null,
          nineBoxDistribution: {},
        },
      },
      { status: 500 },
    );
  }
}
