'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { tenantServiceUrl } from '@/lib/api-url';
import type {
  OnboardingCommitResult,
  OnboardingData,
  OnboardingDraft,
  OnboardingSaveResult,
} from './draft';

export interface CreateTenantState {
  error?: string;
  fieldErrors?: Partial<Record<'company_name' | 'company_slug' | 'plan_id', string>>;
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function onboardingHeaders(): Promise<Record<string, string> | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  return {
    'Content-Type': 'application/json',
    'X-Clerk-User-ID': userId,
    'X-Clerk-Email': user?.primaryEmailAddress?.emailAddress ?? '',
  };
}

/**
 * Fetch the current in-progress draft (creates one if none exists).
 * Returns `null` when the Clerk session is missing.
 */
export async function getDraft(): Promise<OnboardingDraft | null> {
  const headers = await onboardingHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(tenantServiceUrl('/onboarding/progress'), {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as OnboardingDraft;
  } catch {
    return null;
  }
}

/**
 * Persist one step into the draft. Validation errors come back as a
 * field-level map which the client forms surface inline.
 */
export async function saveStep(
  step: number,
  payload: OnboardingData,
): Promise<OnboardingSaveResult> {
  if (step < 1 || step > 10) {
    return { ok: false, error: 'Geçersiz adım.' };
  }
  const headers = await onboardingHeaders();
  if (!headers) return { ok: false, error: 'Oturum bulunamadı.' };

  try {
    const res = await fetch(
      tenantServiceUrl(`/onboarding/progress/${step}`),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        cache: 'no-store',
      },
    );
    if (res.ok) {
      const draft = (await res.json()) as OnboardingDraft;
      revalidatePath('/onboarding', 'layout');
      return { ok: true, draft };
    }
    // 4xx: surface validation detail.
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    const fields = body && typeof body === 'object' && 'fields' in body
      ? (body['fields'] as Record<string, string>)
      : undefined;
    return {
      ok: false,
      error:
        (body && typeof body === 'object' && 'message' in body && typeof body['message'] === 'string'
          ? (body['message'] as string)
          : undefined) ?? `Kaydedilemedi (${res.status}).`,
      fieldErrors: fields,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `Sunucuya ulaşılamadı: ${err.message}` : 'Sunucuya ulaşılamadı.',
    };
  }
}

/** Abandon (idempotent) — used by the "Daha sonra tamamla" escape hatch. */
export async function abandonDraft(): Promise<{ ok: boolean; error?: string }> {
  const headers = await onboardingHeaders();
  if (!headers) return { ok: false, error: 'Oturum bulunamadı.' };
  try {
    const res = await fetch(tenantServiceUrl('/onboarding/abandon'), {
      method: 'POST',
      headers,
      cache: 'no-store',
    });
    if (!res.ok && res.status !== 204) {
      return { ok: false, error: `Hata (${res.status}).` };
    }
    revalidatePath('/onboarding', 'layout');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Sunucuya ulaşılamadı.',
    };
  }
}

/** Final step — create the tenant and redirect to /panel on success. */
export async function commitDraft(): Promise<
  { ok: true; result: OnboardingCommitResult } | { ok: false; error: string }
> {
  const headers = await onboardingHeaders();
  if (!headers) return { ok: false, error: 'Oturum bulunamadı.' };
  try {
    const res = await fetch(tenantServiceUrl('/onboarding/commit'), {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
      cache: 'no-store',
    });
    if (res.status === 201) {
      const result = (await res.json()) as OnboardingCommitResult;
      return { ok: true, result };
    }
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    return {
      ok: false,
      error:
        (body && typeof body === 'object' && 'message' in body && typeof body['message'] === 'string'
          ? (body['message'] as string)
          : undefined) ?? `Kurulum tamamlanamadı (${res.status}).`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Sunucuya ulaşılamadı.',
    };
  }
}

/**
 * Legacy signup action — used by the pre-wizard Step 1 "Kuruluma Başla"
 * button before the onboarding wizard was wired end-to-end. Kept as an
 * admin-fallback path; the wizard itself now routes through saveStep +
 * commitDraft.
 */
export async function createTenant(
  _prevState: CreateTenantState,
  formData: FormData,
): Promise<CreateTenantState> {
  const { userId, getToken } = await auth();
  if (!userId) {
    return { error: 'Oturum bulunamadı. Lütfen yeniden giriş yapın.' };
  }

  const user = await currentUser();
  const companyName = String(formData.get('company_name') ?? '').trim();
  const companySlug = String(formData.get('company_slug') ?? '').trim();
  const planId = String(formData.get('plan_id') ?? 'starter').trim();

  const fieldErrors: CreateTenantState['fieldErrors'] = {};
  if (!companyName || companyName.length < 2) {
    fieldErrors.company_name = 'Şirket adı en az 2 karakter olmalıdır.';
  }
  if (!companySlug || !SLUG_REGEX.test(companySlug)) {
    fieldErrors.company_slug = 'URL küçük harfler, rakamlar ve tire içerebilir.';
  }
  if (!['starter', 'growth', 'enterprise'].includes(planId)) {
    fieldErrors.plan_id = 'Geçerli bir plan seçin.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const token = await getToken();
  const adminEmail = user?.primaryEmailAddress?.emailAddress ?? '';

  try {
    const response = await fetch(tenantServiceUrl('/signup'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
      },
      body: JSON.stringify({
        company_name: companyName,
        company_slug: companySlug,
        admin_email: adminEmail,
        plan_id: planId,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return {
        error:
          response.status === 409
            ? 'Bu URL kullanımda, lütfen farklı bir URL seçin.'
            : `Kurulum başarısız (${response.status}). ${detail}`.trim(),
      };
    }
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Sunucuya ulaşılamadı: ${err.message}`
          : 'Sunucuya ulaşılamadı.',
    };
  }

  redirect('/panel');
}
