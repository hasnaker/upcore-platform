import { NextRequest, NextResponse } from 'next/server';
import { SERVICES } from '@/lib/service-urls';
import { createAuditLogger } from '@/lib/audit-logger';
import { buildServiceHeaders, getRequestContext } from '@/lib/request-context';

type AtsApiStage =
  | 'applied'
  | 'screened'
  | 'assessed'
  | 'interviewed'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

const toAtsApiStage = (stage: string): AtsApiStage => {
  const normalized = stage.toLowerCase();
  switch (normalized) {
    case 'basvuru':
    case 'applied':
      return 'applied';
    case 'on-eleme':
    case 'screening':
    case 'screened':
      return 'screened';
    case 'assessment':
    case 'assessed':
      return 'assessed';
    case 'mulakat':
    case 'interview':
    case 'interviewed':
      return 'interviewed';
    case 'teklif':
    case 'offer':
    case 'offered':
      return 'offered';
    case 'ise-alim':
    case 'hired':
      return 'hired';
    case 'rejected':
      return 'rejected';
    case 'withdrawn':
      return 'withdrawn';
    default:
      return 'applied';
  }
};

const toLegacyStage = (stage: string): string => {
  const normalized = stage.toLowerCase();
  switch (normalized) {
    case 'screened':
      return 'screening';
    case 'assessed':
      return 'assessment';
    case 'interviewed':
      return 'interview';
    case 'offered':
      return 'offer';
    default:
      return normalized;
  }
};

interface JsonRecord {
  items?: unknown;
  total?: unknown;
  id?: unknown;
  count?: unknown;
  current_stage?: unknown;
  score?: unknown;
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

type AtsPosition = {
  id: string;
  title: string;
  status: string;
  location?: string;
  headcount?: number;
  created_at?: string;
};

type AtsCandidate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  source?: string;
  current_title?: string;
  years_experience?: number | null;
  created_at?: string;
};

type AtsApplication = {
  id: string;
  candidate_id: string;
  requisition_id: string;
  current_stage?: string;
  score?: number | null;
  applied_at?: string;
};

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRequestContext(request);
    const headers = buildServiceHeaders(ctx);

    const [positionsRes, candidatesRes, applicationsRes] = await Promise.all([
      fetch(`${SERVICES.ats}/api/v1/ats/requisitions?limit=50`, { headers }),
      fetch(`${SERVICES.ats}/api/v1/ats/candidates?limit=100`, { headers }),
      fetch(`${SERVICES.ats}/api/v1/ats/applications?limit=100`, { headers }),
    ]);

    const positionsData = positionsRes.ok ? await readJson(positionsRes) : { items: [] };
    const candidatesData = candidatesRes.ok ? await readJson(candidatesRes) : { items: [] };
    const applicationsData = applicationsRes.ok ? await readJson(applicationsRes) : { items: [] };

    const positions = (Array.isArray(positionsData.items) ? positionsData.items : []) as AtsPosition[];
    const candidates = (Array.isArray(candidatesData.items) ? candidatesData.items : []) as AtsCandidate[];
    const applications = (Array.isArray(applicationsData.items)
      ? applicationsData.items
      : []) as AtsApplication[];

    const positionMap = new Map<string, AtsPosition>(positions.map((item) => [item.id, item]));
    const candidateMap = new Map<string, AtsCandidate>(candidates.map((item) => [item.id, item]));

    const mergedApplications = applications.map((app) => {
      const candidate = candidateMap.get(app.candidate_id);
      const requisition = positionMap.get(app.requisition_id);
      return {
        id: app.id,
        candidate_id: app.candidate_id,
        open_position_id: app.requisition_id,
        stage: toLegacyStage(app.current_stage || 'applied'),
        fit_score: typeof app.score === 'number' ? app.score : null,
        applied_at: app.applied_at,
        first_name: candidate?.first_name || '',
        last_name: candidate?.last_name || '',
        email: candidate?.email || '',
        current_title: candidate?.current_title || '',
        position_title: requisition?.title || '',
      };
    });

    return NextResponse.json({
      positions: positions.map((position) => ({
        id: position.id,
        title: position.title,
        status: position.status,
        work_location: position.location || '',
        headcount: Number(position.headcount ?? 1),
        created_at: position.created_at,
      })),
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        source: candidate.source,
        current_title: candidate.current_title || '',
        years_experience: candidate.years_experience ?? null,
        created_at: candidate.created_at,
      })),
      applications: mergedApplications,
    });
  } catch {
    return NextResponse.json(
      { error: 'ATS verileri alınamadı', positions: [], candidates: [], applications: [] },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationId, stage, fitScore } = body as {
      applicationId?: string;
      stage?: string;
      fitScore?: number;
    };

    if (!applicationId || !stage) {
      return NextResponse.json({ error: 'applicationId ve stage gerekli' }, { status: 400 });
    }

    const ctx = await getRequestContext(req);
    const headers = buildServiceHeaders(ctx);
    const toStage = toAtsApiStage(stage);

    const moveRes = await fetch(`${SERVICES.ats}/api/v1/ats/applications/${applicationId}/move`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to_stage: toStage }),
    });

    if (!moveRes.ok) {
      const moveError = await readJson(moveRes);
      return NextResponse.json(moveError, { status: moveRes.status });
    }

    if (typeof fitScore === 'number') {
      await fetch(`${SERVICES.ats}/api/v1/ats/applications/${applicationId}/score`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ score: fitScore }),
      });
    }

    const applicationRes = await fetch(`${SERVICES.ats}/api/v1/ats/applications/${applicationId}`, { headers });
    const application = applicationRes.ok ? ((await readJson(applicationRes)) as Partial<AtsApplication>) : null;

    const audit = createAuditLogger(ctx.userId, ctx.userRole, ctx.tenantId);
    void audit.log('update', 'application', applicationId, {
      stage: { old: 'unknown', new: stage },
    });

    return NextResponse.json({
      success: true,
      application: {
        id: applicationId,
        stage: toLegacyStage(application?.current_stage || toStage),
        fit_score: typeof application?.score === 'number' ? application.score : fitScore ?? null,
      },
    });
  } catch (error) {
    console.error('ATS application update error:', error);
    return NextResponse.json({ error: 'Başvuru güncellenemedi' }, { status: 500 });
  }
}
