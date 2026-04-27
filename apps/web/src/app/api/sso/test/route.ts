/**
 * POST /api/sso/test
 *
 * OIDC discovery uç noktasını doğrular:
 * - Entra:  https://login.microsoftonline.com/{tenant_id}/v2.0/.well-known/openid-configuration
 * - Google: https://accounts.google.com/.well-known/openid-configuration
 * - Okta:   https://{domain}/.well-known/openid-configuration
 *
 * Gerçek bir bağlantı testi:
 * 1. Discovery endpoint 10 sn timeout ile GET
 * 2. authorization_endpoint + token_endpoint + userinfo_endpoint varlığı
 * 3. İstenen client_id formu ve (Entra için) tenant_id doğrulaması
 *
 * Hata mesajları Türkçe. Credentials asla log'lanmaz.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 10_000;

type Provider = 'entra' | 'google' | 'okta';

interface TestRequest {
  provider?: Provider;
  client_id?: string;
  client_secret?: string;
  tenant_id?: string;
  domain?: string;
  discovery_url?: string;
}

interface DiscoveryDoc {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  [k: string]: unknown;
}

const buildDiscoveryURL = (body: TestRequest): string | null => {
  if (body.discovery_url) return body.discovery_url;
  switch (body.provider) {
    case 'entra':
      if (!body.tenant_id?.trim()) return null;
      return `https://login.microsoftonline.com/${encodeURIComponent(body.tenant_id.trim())}/v2.0/.well-known/openid-configuration`;
    case 'google':
      return 'https://accounts.google.com/.well-known/openid-configuration';
    case 'okta':
      if (!body.domain?.trim()) return null;
      return `https://${body.domain.trim().replace(/^https?:\/\//, '')}/.well-known/openid-configuration`;
    default:
      return null;
  }
};

const fetchWithTimeout = async (url: string): Promise<Response> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }
};

export async function POST(req: NextRequest) {
  let body: TestRequest;
  try {
    body = (await req.json()) as TestRequest;
  } catch {
    return NextResponse.json({ ok: false, error: 'Geçersiz JSON gövde' }, { status: 400 });
  }

  if (!body.provider) {
    return NextResponse.json({ ok: false, error: 'provider alanı zorunlu' }, { status: 400 });
  }
  if (!body.client_id?.trim()) {
    return NextResponse.json({ ok: false, error: 'Client ID zorunlu' }, { status: 400 });
  }
  if (body.provider === 'entra' && !body.tenant_id?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Entra için Tenant ID zorunlu' },
      { status: 400 },
    );
  }
  if (body.provider === 'okta' && !body.domain?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Okta için domain (ör. sirket.okta.com) zorunlu' },
      { status: 400 },
    );
  }
  if (body.provider !== 'okta' && !body.client_secret?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Bu sağlayıcı için Client Secret zorunlu' },
      { status: 400 },
    );
  }

  const url = buildDiscoveryURL(body);
  if (!url) {
    return NextResponse.json(
      { ok: false, error: 'Discovery URL oluşturulamadı (tenant_id / domain eksik)' },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (err) {
    const msg = (err as Error).name === 'AbortError'
      ? `Discovery endpoint 10 sn içinde yanıt vermedi (${url})`
      : `Bağlantı başarısız: ${(err as Error).message}`;
    return NextResponse.json({ ok: false, error: msg, discovery_url: url }, { status: 504 });
  }

  if (res.status === 404) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Discovery endpoint bulunamadı (404). Tenant ID veya domain hatalı olabilir.',
        discovery_url: url,
      },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Discovery endpoint hata verdi: HTTP ${res.status}`,
        discovery_url: url,
      },
      { status: 502 },
    );
  }

  let doc: DiscoveryDoc;
  try {
    doc = (await res.json()) as DiscoveryDoc;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Discovery dokümanı JSON olarak okunamadı', discovery_url: url },
      { status: 502 },
    );
  }

  const missing: string[] = [];
  if (!doc.authorization_endpoint) missing.push('authorization_endpoint');
  if (!doc.token_endpoint) missing.push('token_endpoint');
  if (!doc.userinfo_endpoint) missing.push('userinfo_endpoint');
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Discovery dokümanında eksik alanlar: ${missing.join(', ')}`,
        discovery_url: url,
      },
      { status: 502 },
    );
  }

  // Client ID format ön kontrolü
  const cid = body.client_id.trim();
  if (body.provider === 'entra' && !/^[0-9a-f-]{36}$/i.test(cid)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Entra Client ID UUID formatında olmalı (8-4-4-4-12 hexadecimal)',
        discovery_url: url,
      },
      { status: 400 },
    );
  }

  // Başarılı
  return NextResponse.json({
    ok: true,
    message: 'Bağlantı başarılı — OIDC discovery dokümanı doğrulandı',
    issuer: doc.issuer ?? null,
    discovery_url: url,
    endpoints: {
      authorization: doc.authorization_endpoint,
      token: doc.token_endpoint,
      userinfo: doc.userinfo_endpoint,
      jwks: doc.jwks_uri ?? null,
    },
  });
}
