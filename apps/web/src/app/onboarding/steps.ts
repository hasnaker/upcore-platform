export interface OnboardingStep {
  order: number;
  slug: string;
  title: string;
  description: string;
  optional?: boolean;
  requiresModule?: 'payroll';
  minPlan?: 'starter' | 'growth' | 'enterprise';
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    order: 1,
    slug: 'sirket',
    title: 'Şirket bilgileri',
    description: 'Ad, VKN, sektör ve çalışan sayısı aralığı.',
  },
  {
    order: 2,
    slug: 'yonetici',
    title: 'Admin kullanıcı',
    description: 'İlk yönetici hesabı ve 2FA zorunluluğu.',
  },
  {
    order: 3,
    slug: 'modul',
    title: 'Modül seçimi',
    description: 'Lisans planına göre aktif edilecek modüller.',
  },
  {
    order: 4,
    slug: 'calisan',
    title: 'Çalışan içe aktarma',
    description: 'CSV yükleyin veya 1-5 çalışanı elle ekleyin.',
  },
  {
    order: 5,
    slug: 'organizasyon',
    title: 'Organizasyon şeması',
    description: 'Departman ve yönetici hiyerarşisi.',
  },
  {
    order: 6,
    slug: 'sso',
    title: 'Tek oturum açma',
    description: 'Microsoft Entra, Google Workspace veya Okta.',
    optional: true,
    minPlan: 'growth',
  },
  {
    order: 7,
    slug: 'kvkk',
    title: 'KVKK başlangıç',
    description: 'Aydınlatma metni ve VERBIS kayıt kontrol listesi.',
  },
  {
    order: 8,
    slug: 'bordro',
    title: 'SGK ve bordro',
    description: 'İşyeri kodu, banka hesabı, ödeme günü.',
    optional: true,
    requiresModule: 'payroll',
  },
  {
    order: 9,
    slug: 'entegrasyon',
    title: 'Entegrasyonlar',
    description: 'Slack, Teams, Kariyer.net XML feed.',
    optional: true,
  },
  {
    order: 10,
    slug: 'ozet',
    title: 'Özet ve canlıya geç',
    description: 'Kontrol listesi ve aktivasyon.',
  },
] as const;

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function getStepBySlug(slug: string): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((s) => s.slug === slug);
}

export function getStepByOrder(order: number): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((s) => s.order === order);
}

export function nextStepSlug(current: number): string | null {
  const next = getStepByOrder(current + 1);
  return next ? next.slug : null;
}

export function prevStepSlug(current: number): string | null {
  const prev = getStepByOrder(current - 1);
  return prev ? prev.slug : null;
}
