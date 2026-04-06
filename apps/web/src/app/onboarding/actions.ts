'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { tenantServiceUrl } from '@/lib/api-url';

export interface CreateTenantState {
  error?: string;
  fieldErrors?: Partial<Record<'company_name' | 'company_slug' | 'plan_id', string>>;
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
