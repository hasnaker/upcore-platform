'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveStep } from '@/app/onboarding/actions';
import type { OnboardingDraft, SSOData } from '@/app/onboarding/draft';

interface Step6SSOProps {
  draft: OnboardingDraft | null;
  nextSlug: string | null;
}

type Provider = '' | 'google' | 'entra' | 'okta';

const PROVIDERS: Array<{ id: Provider; name: string; description: string }> = [
  { id: 'google', name: 'Google Workspace', description: 'OAuth 2.0 · Google domain' },
  { id: 'entra', name: 'Microsoft Entra (Azure AD)', description: 'OAuth 2.0 · Tenant ID gerekir' },
  { id: 'okta', name: 'Okta', description: 'SAML 2.0 · Okta domain' },
];

// Plans that unlock SSO — in sync with Step3 plan allowances for enterprise-y
// modules. Wizard step 6 is optional and only shown when a Pro+ plan was
// chosen, but we still enforce it client-side for safety.
const ALLOWED_PLANS = ['platform', 'enterprise'];

export function Step6SSO({ draft, nextSlug }: Step6SSOProps) {
  const router = useRouter();
  const existing = draft?.data.sso;
  const planId = draft?.data.plan?.plan_id ?? '';
  const planAllows = ALLOWED_PLANS.includes(planId);

  const [enabled, setEnabled] = useState(existing?.enabled ?? false);
  const [provider, setProvider] = useState<Provider>((existing?.provider as Provider) ?? '');
  const [clientId, setClientId] = useState(existing?.client_id ?? '');
  const [clientSecret, setClientSecret] = useState(existing?.client_secret ?? '');
  const [tenantId, setTenantId] = useState(existing?.tenant_id ?? '');
  const [domain, setDomain] = useState(existing?.domain ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    | { ok: true; message: string; issuer: string | null }
    | { ok: false; error: string }
    | null
  >(null);

  const runConnectivityTest = async () => {
    setTestResult(null);
    setError(null);
    if (!provider) {
      setTestResult({ ok: false, error: 'Önce SSO sağlayıcı seçiniz.' });
      return;
    }
    if (!clientId.trim()) {
      setTestResult({ ok: false, error: 'Client ID zorunlu.' });
      return;
    }
    if (provider === 'entra' && !tenantId.trim()) {
      setTestResult({ ok: false, error: 'Entra için Tenant ID zorunlu.' });
      return;
    }
    if (provider === 'okta' && !domain.trim()) {
      setTestResult({ ok: false, error: 'Okta için domain zorunlu.' });
      return;
    }
    if (provider !== 'okta' && !clientSecret.trim()) {
      setTestResult({ ok: false, error: 'Client Secret zorunlu.' });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/sso/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          client_id: clientId.trim(),
          client_secret: clientSecret.trim() || undefined,
          tenant_id: tenantId.trim() || undefined,
          domain: domain.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        issuer?: string | null;
      };
      if (data.ok) {
        setTestResult({
          ok: true,
          message: data.message ?? 'Bağlantı başarılı',
          issuer: data.issuer ?? null,
        });
      } else {
        setTestResult({ ok: false, error: data.error ?? `HTTP ${res.status}` });
      }
    } catch (err) {
      setTestResult({ ok: false, error: (err as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const testPassed = testResult?.ok === true;

  const onSave = () => {
    setError(null);
    if (enabled) {
      if (!provider) {
        setError('SSO sağlayıcı seçiniz.');
        return;
      }
      if (!clientId.trim()) {
        setError('Client ID zorunlu.');
        return;
      }
      if (provider !== 'okta' && !clientSecret.trim()) {
        setError('Client Secret zorunlu.');
        return;
      }
      if (provider === 'entra' && !tenantId.trim()) {
        setError('Entra için Tenant ID zorunlu.');
        return;
      }
      if (!testPassed) {
        setError('Kaydetmeden önce "Bağlantıyı test et" butonu ile doğrulama yapın.');
        return;
      }
    }
    const payload: SSOData = {
      enabled,
      provider,
      ...(clientId.trim() ? { client_id: clientId.trim() } : {}),
      ...(clientSecret.trim() ? { client_secret: clientSecret.trim() } : {}),
      ...(tenantId.trim() ? { tenant_id: tenantId.trim() } : {}),
      ...(domain.trim() ? { domain: domain.trim() } : {}),
    };
    start(async () => {
      const res = await saveStep(6, { sso: payload });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  const skip = () => {
    start(async () => {
      const res = await saveStep(6, { sso: { enabled: false, provider: '' } });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  if (!planAllows) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-amber-soft bg-amber-soft/30 p-4 text-sm">
          <p className="font-medium text-ink">SSO Platform veya Kurumsal planlarında açılır</p>
          <p className="mt-1 text-ink-60">
            Seçtiğiniz <strong>{planId || 'plan'}</strong> planı SSO içermiyor. Sonradan plan yükseltmesi ile aktifleştirebilirsiniz.
          </p>
        </div>
        <button
          type="button"
          onClick={skip}
          disabled={isPending}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-bg hover:bg-accent/90 disabled:opacity-60"
        >
          {isPending ? 'Kaydediliyor…' : 'Atla ve devam et'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-bg p-4 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span className="flex-1">
          <span className="block font-medium text-ink">Tek oturum açma (SSO) kullanacağım</span>
          <span className="block text-xs text-ink-60">
            Google Workspace, Microsoft Entra (Azure AD) veya Okta üzerinden oturum açma.
          </span>
        </span>
      </label>

      {enabled && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {PROVIDERS.map((p) => (
              <label
                key={p.id}
                className={`cursor-pointer rounded-lg border p-3 text-sm ${
                  provider === p.id ? 'border-accent ring-1 ring-accent bg-accent-soft/30' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="sso_provider"
                  value={p.id}
                  checked={provider === p.id}
                  onChange={() => setProvider(p.id)}
                  className="sr-only"
                />
                <span className="block font-medium text-ink">{p.name}</span>
                <span className="block text-xs text-ink-60">{p.description}</span>
              </label>
            ))}
          </div>

          {provider && (
            <div className="space-y-4 rounded-md border border-line bg-bg-2 p-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Client ID</label>
                <input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
                />
              </div>
              {provider !== 'okta' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Client Secret</label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
                  />
                </div>
              )}
              {provider === 'entra' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Entra Tenant ID</label>
                  <input
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Domain</label>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder={provider === 'okta' ? 'sirketiniz.okta.com' : 'sirket.com'}
                  className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => void runConnectivityTest()}
                  disabled={testing || isPending}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-accent px-3 text-sm font-medium text-accent hover:bg-accent-soft disabled:opacity-60"
                >
                  {testing ? 'Test ediliyor…' : 'Bağlantıyı test et'}
                </button>
                {testResult && testResult.ok && (
                  <div className="flex-1 rounded-md border border-green-soft bg-green-soft/30 p-2 text-xs text-green">
                    <div className="font-medium">✓ {testResult.message}</div>
                    {testResult.issuer && (
                      <div className="mt-0.5 truncate text-[11px] text-ink-60">
                        issuer: {testResult.issuer}
                      </div>
                    )}
                  </div>
                )}
                {testResult && !testResult.ok && (
                  <div className="flex-1 rounded-md border border-red-soft bg-red-soft/30 p-2 text-xs text-red">
                    <div className="font-medium">✗ Bağlantı başarısız</div>
                    <div className="mt-0.5 text-[11px]">{testResult.error}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="rounded-md border border-red-soft bg-red-soft/40 p-3 text-sm text-red">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending || (enabled && !!provider && !testPassed)}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-bg hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          title={enabled && !!provider && !testPassed ? 'Önce bağlantıyı test edin' : undefined}
        >
          {isPending ? 'Kaydediliyor…' : 'Kaydet ve devam et'}
        </button>
        <button type="button" onClick={skip} className="text-xs text-ink-60 underline">
          Şimdi atla
        </button>
      </div>
    </div>
  );
}
