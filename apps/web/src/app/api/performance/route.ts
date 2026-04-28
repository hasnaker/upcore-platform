import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

type Band = 'low' | 'medium' | 'high';

interface JsonRecord {
  items?: unknown;
}

const readJson = async (response: Response): Promise<JsonRecord> => {
  try {
    const data = (await response.json()) as unknown;
    if (data && typeof data === 'object') {
      return data as JsonRecord;
    }
    return {};
  } catch {
    return {};
  }
};

type PerformanceCycle = {
  id: string;
  status?: string;
  name_tr?: string;
};

type PerformanceEmployee = {
  id: string;
  ad?: string;
  soyad?: string;
  department_id?: string;
};

type PerformanceReview = {
  id: string;
  employee_id: string;
  cycle_id: string;
  performance_rating?: number | string | null;
  potential_rating?: number | string | null;
  goals_achieved_pct?: number | null;
  status?: string;
};

type NineBoxItem = {
  id: string;
  employee_id: string;
  cycle_id: string;
  performance_band?: string;
  potential_band?: string;
  talent_segment?: string;
  box_label?: string;
};

type ReviewPayloadItem = {
  id: string;
  employee: string;
  department: string;
  period: string;
  okrScore: number | null;
  competencyScore: number | null;
  overallScore: number;
  potentialScore: number | null;
  potentialRating: 'high' | 'medium' | 'low';
  status?: string;
};

const bandToScore = (band: string): number => {
  switch ((band || '').toLowerCase()) {
    case 'high':
      return 85;
    case 'medium':
      return 65;
    default:
      return 40;
  }
};

const ratingToPercent = (value: unknown): number | null => {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  if (num <= 5) return Math.round((num / 5) * 100);
  if (num <= 100) return Math.round(num);
  return null;
};

const bandFromPercent = (value: number | null): Band => {
  if (value === null) return 'medium';
  if (value >= 75) return 'high';
  if (value >= 50) return 'medium';
  return 'low';
};

const potentialLabel = (value: number | null): 'high' | 'medium' | 'low' => {
  if (value === null) return 'medium';
  if (value >= 75) return 'high';
  if (value >= 50) return 'medium';
  return 'low';
};

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    const headers = buildServiceHeaders(ctx);

    const cyclesRes = await fetch(`${SERVICES.performance}/api/v1/performance/cycles?limit=20`, { headers });
    const cyclesData = cyclesRes.ok ? await readJson(cyclesRes) : { items: [] };
    const cycles = (Array.isArray(cyclesData.items) ? cyclesData.items : []) as PerformanceCycle[];

    const activeCycle =
      cycles.find((cycle) =>
        ['goal_setting', 'active', 'in_review', 'calibration'].includes(String(cycle.status)),
      ) || cycles[0];

    const cycleId = activeCycle?.id;

    const reviewUrl = cycleId
      ? `${SERVICES.performance}/api/v1/performance/reviews?cycle_id=${encodeURIComponent(cycleId)}`
      : `${SERVICES.performance}/api/v1/performance/reviews`;

    const [reviewsRes, employeesRes, nineBoxRes] = await Promise.all([
      fetch(reviewUrl, { headers }),
      fetch(`${SERVICES.employee}/api/v1/employees?limit=500`, { headers }),
      cycleId
        ? fetch(
            `${SERVICES.performance}/api/v1/performance/nine-box/grid?cycle_id=${encodeURIComponent(cycleId)}`,
            { headers },
          )
        : Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 })),
    ]);

    const reviewsData = reviewsRes.ok ? await readJson(reviewsRes) : { items: [] };
    const employeesData = employeesRes.ok ? await readJson(employeesRes) : { items: [] };
    const nineBoxData = nineBoxRes.ok ? await readJson(nineBoxRes) : { items: [] };

    const reviews = (Array.isArray(reviewsData.items) ? reviewsData.items : []) as PerformanceReview[];
    const employeeItems = (Array.isArray(employeesData.items)
      ? employeesData.items
      : []) as PerformanceEmployee[];
    const nineBoxItems = (Array.isArray(nineBoxData.items) ? nineBoxData.items : []) as NineBoxItem[];

    const cycleById = new Map<string, PerformanceCycle>(cycles.map((cycle) => [cycle.id, cycle]));
    const employeeById = new Map<string, PerformanceEmployee>(
      employeeItems.map((employee) => [employee.id, employee]),
    );

    const reviewPayload: ReviewPayloadItem[] = reviews.map((review) => {
      const employee = employeeById.get(review.employee_id);
      const performanceScore = ratingToPercent(review.performance_rating);
      const okrScore =
        typeof review.goals_achieved_pct === 'number' ? Number(review.goals_achieved_pct) : performanceScore;
      const competencyScore = performanceScore;
      const overallScore =
        okrScore !== null && competencyScore !== null
          ? Math.round((okrScore + competencyScore) / 2)
          : okrScore ?? competencyScore ?? 0;
      const potentialScore = ratingToPercent(review.potential_rating);

      return {
        id: review.id,
        employee: `${employee?.ad || ''} ${employee?.soyad || ''}`.trim() || review.employee_id,
        department: employee?.department_id || '',
        period: cycleById.get(review.cycle_id)?.name_tr || review.cycle_id,
        okrScore,
        competencyScore,
        overallScore,
        potentialScore,
        potentialRating: potentialLabel(potentialScore),
        status: review.status,
      };
    });

    const nineBoxPayload = nineBoxItems.map((item) => {
      const employee = employeeById.get(item.employee_id);
      const performanceBand = String(item.performance_band || 'medium');
      const potentialBand = String(item.potential_band || 'medium');
      return {
        id: item.id,
        employee: `${employee?.ad || ''} ${employee?.soyad || ''}`.trim() || item.employee_id,
        department: employee?.department_id || '',
        performanceScore: bandToScore(performanceBand),
        potentialScore: bandToScore(potentialBand),
        category: item.talent_segment || item.box_label || `${performanceBand}_${potentialBand}`,
        period: cycleById.get(item.cycle_id)?.name_tr || '',
      };
    });

    const autoNineBox = reviewPayload.map((review) => {
      const performanceBand = bandFromPercent(
        typeof review.overallScore === 'number' ? Number(review.overallScore) : null,
      );
      const potentialBand = bandFromPercent(
        typeof review.potentialScore === 'number' ? Number(review.potentialScore) : null,
      );
      return {
        employee: review.employee,
        department: review.department,
        performance: performanceBand,
        potential: potentialBand,
        performanceScore: typeof review.overallScore === 'number' ? review.overallScore : bandToScore(performanceBand),
        potentialScore:
          typeof review.potentialScore === 'number'
            ? review.potentialScore
            : bandToScore(potentialBand),
      };
    });

    return NextResponse.json({
      reviews: reviewPayload,
      nineBox: nineBoxPayload,
      autoNineBox,
      trends: {},
    });
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { error: 'Performans verileri alınamadı', reviews: [], nineBox: [], autoNineBox: [], trends: {} },
      { status: 500 },
    );
  }
}
