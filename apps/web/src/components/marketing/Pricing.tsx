import Link from 'next/link';
import { Check } from 'lucide-react';

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: 'Başlangıç',
    price: '₺0',
    description: '25 çalışana kadar · 14 gün ücretsiz',
    features: [
      'Temel çalışan yönetimi',
      'Pulse anketleri (aylık)',
      'BAT-TR tükenmişlik ölçümü',
      'KVKK uyumlu',
    ],
    cta: 'Ücretsiz Başla',
    ctaHref: '/kayit',
  },
  {
    name: 'Büyüme',
    price: '₺49',
    description: 'çalışan/ay · 100 çalışana kadar',
    features: [
      'Tüm Başlangıç özellikleri',
      'Değerlendirmeler (PsyCap, JD-R)',
      'Departman bazlı ısı haritası',
      'Aksiyon merkezi',
      'API erişimi',
    ],
    cta: 'Ücretsiz Başla',
    ctaHref: '/kayit',
    featured: true,
  },
  {
    name: 'Kurumsal',
    price: 'Özel',
    description: 'Sınırsız çalışan · SSO · DPA',
    features: [
      'Tüm Büyüme özellikleri',
      'SSO (Azure AD, Okta)',
      'Özel entegrasyonlar',
      'DPA + ISO 27001',
      'Adanmış müşteri temsilcisi',
    ],
    cta: 'İletişime Geç',
    ctaHref: '/iletisim',
  },
];

export function Pricing() {
  return (
    <section className="border-b border-line bg-bg">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Şeffaf fiyatlandırma
          </h2>
          <p className="mt-4 text-ink-60">
            Çalışan başına aylık ücret. Saklı maliyet yok, kullandığın kadar öde.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                'flex flex-col rounded-lg border bg-bg p-8 ' +
                (tier.featured ? 'border-accent ring-1 ring-accent' : 'border-line')
              }
            >
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-60">
                  {tier.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-ink">{tier.price}</span>
                </div>
                <p className="mt-2 text-sm text-ink-60">{tier.description}</p>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-ink-80">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.ctaHref}
                className={
                  'mt-8 inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
                  (tier.featured
                    ? 'bg-accent text-bg hover:bg-accent/90'
                    : 'border border-line bg-bg text-ink hover:bg-bg-2')
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
