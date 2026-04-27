/**
 * POST /api/consent/cookie
 *
 * Cookie consent tercih log'u — audit servisine forward.
 * Amaç: KVKK Madde 5 rıza ispatı (6 yıl saklama, WORM audit log).
 *
 * Client tarafı için bkz: `src/components/CookieConsent.tsx`.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUDIT_ENDPOINT = process.env['AUDIT_SERVICE_URL']
  ? `${process.env['AUDIT_SERVICE_URL']!.replace(/\/$/, '')}/api/v1/events`
  : null;

interface ConsentBody {
  version?: string;
  decidedAt?: string;
  categories?: Record<string, boolean>;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: ConsentBody;
  try {
    body = (await req.json()) as ConsentBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.version || !body.categories) {
    return NextResponse.json({ error: 'validation_error', message: 'version ve categories zorunlu' }, { status: 422 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const event = {
    event_type: 'cookie_consent.recorded',
    timestamp: new Date().toISOString(),
    source: 'web',
    actor: { type: 'anonymous', ip, user_agent: userAgent },
    payload: {
      version: body.version,
      decided_at: body.decidedAt ?? new Date().toISOString(),
      categories: body.categories,
    },
  };

  // Audit servisine async forward — fail olursa UX etkilenmez (log stderr'a düşer)
  if (AUDIT_ENDPOINT) {
    try {
      const res = await fetch(AUDIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-UpCore-Source': 'web-consent',
        },
        body: JSON.stringify(event),
        // 2s sonrası bırak — banner interaktivitesi engellenmesin
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) {
        console.error('[consent] audit forward failed', res.status);
      }
    } catch (err) {
      console.error('[consent] audit forward error', err);
    }
  } else {
    // Dev: sadece konsola yaz
    console.info('[consent]', JSON.stringify(event));
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
