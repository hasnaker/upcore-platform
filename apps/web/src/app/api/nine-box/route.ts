import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';
import { validateNineBoxPatch } from '@/lib/validation';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

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
};

const scoreToBand = (score: number | null | undefined): 'low' | 'medium' | 'high' => {
  const numeric = typeof score === 'number' ? score : 0;
  if (numeric >= 75) return 'high';
  if (numeric >= 50) return 'medium';
  return 'low';
};

const resolveCycleId = async (headers: HeadersInit): Promise<string | null> => {
  const cyclesRes = await fetch(`${SERVICES.performance}/api/v1/performance/cycles?limit=20`, { headers });
  if (!cyclesRes.ok) return null;
  const cyclesData = await readJson(cyclesRes);
  const items = (Array.isArray(cyclesData.items) ? cyclesData.items : []) as PerformanceCycle[];
  const active =
    items.find((cycle) =>
      ['goal_setting', 'active', 'in_review', 'calibration'].includes(String(cycle.status)),
    ) || items[0];
  return active?.id || null;
};

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateNineBoxPatch(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Gecersiz veri', details: validation.errors }, { status: 400 });
    }

    const { employeeId, performanceScore, potentialScore, category } = validation.data!;
    const ctx = await getRequestContext(req);
    const headers = buildServiceHeaders(ctx);
    const cycleId = await resolveCycleId(headers);

    if (!cycleId) {
      return NextResponse.json({ error: 'Aktif değerlendirme dönemi bulunamadı' }, { status: 409 });
    }

    const upsertRes = await fetch(`${SERVICES.performance}/api/v1/performance/nine-box`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        cycle_id: cycleId,
        employee_id: employeeId,
        performance_band: scoreToBand(performanceScore),
        potential_band: scoreToBand(potentialScore),
        calibration_notes: category || '',
      }),
    });

    if (!upsertRes.ok) {
      const errorBody = await readJson(upsertRes);
      return NextResponse.json(errorBody, { status: upsertRes.status });
    }

    const audit = createAuditLogger(ctx.userId, ctx.userRole, ctx.tenantId);
    void audit.log('update', 'nine_box', employeeId, {
      performance_score: { old: null, new: performanceScore },
      potential_score: { old: null, new: potentialScore },
      category: { old: null, new: category },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Nine-box update error:', error);
    return NextResponse.json({ error: '9-Box güncellenemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { updates } = body as {
      updates: Array<{ employeeId: string; performanceScore: number; potentialScore: number; category: string }>;
    };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates array zorunlu' }, { status: 400 });
    }

    const ctx = await getRequestContext(req);
    const headers = buildServiceHeaders(ctx);
    const cycleId = await resolveCycleId(headers);

    if (!cycleId) {
      return NextResponse.json({ error: 'Aktif değerlendirme dönemi bulunamadı' }, { status: 409 });
    }

    const results = await Promise.all(
      updates.map((update) =>
        fetch(`${SERVICES.performance}/api/v1/performance/nine-box`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            cycle_id: cycleId,
            employee_id: update.employeeId,
            performance_band: scoreToBand(update.performanceScore),
            potential_band: scoreToBand(update.potentialScore),
            calibration_notes: update.category || '',
          }),
        }),
      ),
    );

    const updated = results.filter((result) => result.ok).length;

    const audit = createAuditLogger(ctx.userId, ctx.userRole, ctx.tenantId);
    void audit.log('update', 'nine_box_calibration', undefined, undefined, { count: updates.length });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('Nine-box calibration error:', error);
    return NextResponse.json({ error: 'Kalibrasyon kaydedilemedi' }, { status: 500 });
  }
}
