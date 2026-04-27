import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

const mapActionRole = (role: string): 'hr_director' | 'people_partner' | 'line_manager' | 'employee' | 'executive' => {
  switch (role) {
    case 'hr_director':
      return 'hr_director';
    case 'manager':
      return 'line_manager';
    case 'employee':
      return 'employee';
    case 'super_admin':
    case 'admin':
      return 'executive';
    default:
      return 'people_partner';
  }
};

export async function GET(request: NextRequest) {
  try {
    const ctx = getRequestContext(request);
    const headers = buildServiceHeaders(ctx);

    const [actionsRes, criticalRes] = await Promise.all([
      fetch(`${SERVICES.actionCenter}/api/v1/actions/next`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tenant_id: ctx.tenantId,
          user_id: ctx.userId,
          role: mapActionRole(ctx.userRole),
          language: 'tr-TR',
        }),
        cache: 'no-store',
      }),
      fetch(`${SERVICES.burnout}/api/v1/burnout/critical?limit=5`, {
        headers,
        cache: 'no-store',
      }),
    ]);

    const actionsData = actionsRes.ok ? await actionsRes.json() : { actions: [] };
    const criticalData = criticalRes.ok ? await criticalRes.json() : { items: [] };

    const topEmployee = criticalData?.items?.[0];
    let recommendations: unknown[] = [];
    let prediction: unknown = null;

    if (topEmployee?.employee_id) {
      const [recRes, predRes] = await Promise.all([
        fetch(`${SERVICES.recommend}/api/v1/recommend/individual`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tenant_id: ctx.tenantId,
            employee_id: topEmployee.employee_id,
            burnout_prediction: { '30d': Number(topEmployee.score || 0) / 5 },
            max_recommendations: 3,
            context: { language: 'tr-TR' },
          }),
          cache: 'no-store',
        }),
        fetch(`${SERVICES.burnout}/api/v1/burnout/predict/burnout`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tenant_id: ctx.tenantId,
            employee_id: topEmployee.employee_id,
            horizon_days: [30, 60, 90],
          }),
          cache: 'no-store',
        }),
      ]);

      if (recRes.ok) {
        const recData = await recRes.json();
        recommendations = recData.recommendations || [];
      }
      if (predRes.ok) {
        prediction = await predRes.json();
      }
    }

    return NextResponse.json({
      ml_actions: actionsData.actions || [],
      critical_employees: criticalData.items || [],
      recommendations,
      prediction,
    });
  } catch {
    return NextResponse.json(
      {
        error: 'Action verileri alınamadı',
        ml_actions: [],
        critical_employees: [],
        recommendations: [],
        prediction: null,
      },
      { status: 500 },
    );
  }
}
