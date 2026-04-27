/**
 * UpCap-TR v1.0 scoring proxy.
 *
 * Thin proxy to psychometric-scoring FastAPI service.
 *  POST /api/upcap-tr/score -> POST {SCORING}/api/v1/score/upcap-tr
 */

import { NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { getRequestContext } from '@/lib/request-context';

type ScorePayload = {
  responses: Record<string, number>;
  sector?: 'public_sector' | 'holding' | 'sme' | 'health' | 'education' | null;
  ageBand?: '22_30' | '31_45' | '46_60' | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not' | null;
  assessmentId?: string;
};

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = getRequestContext(request);
  } catch (err) {
    return NextResponse.json(
      { error: 'Authentication required', details: String(err) },
      { status: 401 },
    );
  }

  let body: ScorePayload;
  try {
    body = (await request.json()) as ScorePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.responses || Object.keys(body.responses).length !== 12) {
    return NextResponse.json(
      { error: 'UpCap-TR requires exactly 12 responses (upcap_01..upcap_12)' },
      { status: 422 },
    );
  }

  const payload = {
    tenant_id: ctx.tenantId,
    employee_id: ctx.userId,
    assessment_id: body.assessmentId ?? '00000000-0000-0000-0000-000000000000',
    responses: body.responses,
    sector: body.sector ?? null,
    age_band: body.ageBand ?? null,
    gender: body.gender ?? null,
    language: 'tr-TR',
  };

  try {
    const res = await fetch(`${SERVICES.scoring}/api/v1/score/upcap-tr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Scoring service unreachable', details: String(err) },
      { status: 502 },
    );
  }
}

export async function GET() {
  try {
    const res = await fetch(`${SERVICES.scoring}/api/v1/score/upcap-tr/norms`, {
      method: 'GET',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Scoring service unreachable', details: String(err) },
      { status: 502 },
    );
  }
}
