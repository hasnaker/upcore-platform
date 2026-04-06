import { NextResponse } from 'next/server';
import { SERVICES, TENANT_ID } from '@/lib/service-urls';

// Score an assessment via Python psychometric-scoring service
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { instrument, responses, tenantId, employeeId, assessmentId } = body;

    let endpoint = '/v1/score/bat12';
    let payload: Record<string, unknown> = {
      tenant_id: tenantId || TENANT_ID,
      employee_id: employeeId || '00000000-0000-0000-0000-000000000000',
      assessment_id: assessmentId || '00000000-0000-0000-0000-000000000000',
      responses,
    };

    if (instrument === 'copsoq') endpoint = '/v1/score/copsoq';
    if (instrument === 'upcap') endpoint = '/v1/score/upcap';
    if (instrument === 'jdr') {
      endpoint = '/v1/score/jdr';
      payload = {
        tenant_id: payload.tenant_id,
        employee_id: payload.employee_id,
        assessment_id: payload.assessment_id,
        demands_z: responses.demands_z,
        resources_z: responses.resources_z,
      };
    }

    const res = await fetch(`${SERVICES.scoring}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Scoring başarısız', details: String(error) }, { status: 500 });
  }
}
