import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

const categoryMap: Record<string, string> = {
  WORKLOAD: 'workload',
  AUTONOMY: 'role_design',
  RELATIONSHIPS: 'social_support',
  RECOGNITION: 'recognition',
  GROWTH: 'skill_dev',
  WELLBEING: 'wellbeing',
  COACHING: 'coaching',
  ROLE_DESIGN: 'role_design',
};

const normalizeCategory = (value: string): string => {
  const key = value.trim().toUpperCase();
  return categoryMap[key] || value.trim().toLowerCase() || 'other';
};

interface JsonRecord {
  items?: unknown;
  total?: unknown;
  id?: unknown;
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

export async function GET(request: NextRequest) {
  try {
    const ctx = getRequestContext(request);
    const headers = buildServiceHeaders(ctx);
    const res = await fetch(
      `${SERVICES.intervention}/api/v1/interventions/catalog?is_active=true&limit=100`,
      { headers },
    );
    const data = res.ok ? await readJson(res) : { items: [] };
    const items = Array.isArray(data.items) ? data.items : [];
    return NextResponse.json({ items, total: data.total ?? items.length });
  } catch {
    return NextResponse.json({ error: 'Müdahale verileri alınamadı', items: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = getRequestContext(req);
    const headers = buildServiceHeaders(ctx);
    const body = await req.json();

    const interventionId = body.interventionId || body.intervention_id;
    const employeeId = body.employeeId || body.employee_id;

    if (interventionId && employeeId) {
      const assignRes = await fetch(`${SERVICES.intervention}/api/v1/interventions/assignments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          intervention_id: interventionId,
          employee_id: employeeId,
          notes: body.notes || null,
          trigger_source: body.trigger_source || 'manual',
        }),
      });

      const assignData = await readJson(assignRes);
      if (!assignRes.ok) {
        return NextResponse.json(assignData, { status: assignRes.status });
      }

      const audit = createAuditLogger(ctx.userId, ctx.userRole, ctx.tenantId);
      const assignId = typeof assignData.id === 'string' ? assignData.id : '';
      void audit.log('create', 'intervention_assignment', assignId, undefined, {
        interventionId,
        employeeId,
      });

      return NextResponse.json({ success: true, id: assignId }, { status: 201 });
    }

    const category = normalizeCategory(body.category || '');
    const description = String(body.description || '').trim();
    const title = description ? description.slice(0, 80) : 'Özel Müdahale';
    const code = `custom-${Date.now().toString(36)}`;

    const createRes = await fetch(`${SERVICES.intervention}/api/v1/interventions/catalog`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code,
        title_tr: title,
        description_tr: description || 'Manuel olarak oluşturulan müdahale',
        category,
        evidence_tier: 'C',
        target_drivers: [],
        target_burnout_band: [],
        delivery_mode: 'self_service',
        active: true,
      }),
    });

    const created = await readJson(createRes);
    if (!createRes.ok) {
      return NextResponse.json(created, { status: createRes.status });
    }

    const audit = createAuditLogger(ctx.userId, ctx.userRole, ctx.tenantId);
    const createdId = typeof created.id === 'string' ? created.id : '';
    void audit.log('create', 'intervention_catalog', createdId, undefined, {
      category,
      code,
    });

    return NextResponse.json({ success: true, id: createdId, item: created }, { status: 201 });
  } catch (error: unknown) {
    console.error('Intervention assignment error:', error);
    return NextResponse.json({ error: 'Müdahale ataması yapılamadı' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = getRequestContext(req);
    const headers = buildServiceHeaders(ctx);
    const body = await req.json();
    const { assignmentId, status, outcome } = body as {
      assignmentId?: string;
      status?: 'in_progress' | 'completed' | 'cancelled';
      outcome?: string;
    };

    if (!assignmentId || !status) {
      return NextResponse.json({ error: 'assignmentId ve status gerekli' }, { status: 400 });
    }

    const validStatuses = ['in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Geçersiz status: ${status}` }, { status: 400 });
    }

    let endpoint = '';
    let payload: Record<string, unknown> = {};

    if (status === 'in_progress') {
      endpoint = `/api/v1/interventions/assignments/${assignmentId}/start`;
    } else if (status === 'completed') {
      endpoint = `/api/v1/interventions/assignments/${assignmentId}/complete`;
    } else {
      endpoint = `/api/v1/interventions/assignments/${assignmentId}/cancel`;
      payload = { reason: outcome || 'Cancelled from web app' };
    }

    const transitionRes = await fetch(`${SERVICES.intervention}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!transitionRes.ok) {
      const transitionErr = await readJson(transitionRes);
      return NextResponse.json(transitionErr, { status: transitionRes.status });
    }

    if (status === 'completed' && outcome) {
      await fetch(`${SERVICES.intervention}/api/v1/interventions/assignments/${assignmentId}/outcomes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notes: outcome }),
      });
    }

    const audit = createAuditLogger(ctx.userId, ctx.userRole, ctx.tenantId);
    void audit.log('update', 'intervention_assignment', assignmentId, {
      status: { old: 'unknown', new: status },
    });

    return NextResponse.json({ success: true, assignmentId, status });
  } catch (error: unknown) {
    console.error('Intervention assignment update error:', error);
    return NextResponse.json({ error: 'Müdahale ataması güncellenemedi' }, { status: 500 });
  }
}
