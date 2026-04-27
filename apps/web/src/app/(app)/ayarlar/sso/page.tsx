'use client';

import Link from 'next/link';
import { Building2, CheckCircle2, ExternalLink, KeyRound, ShieldCheck } from 'lucide-react';

export default function SSOAdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ayarlar" className="text-[12px] text-ink-40 hover:underline">← Ayarlar</Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
          <ShieldCheck className="h-5 w-5" />
          Enterprise SSO (SAML)
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          Azure AD, Google Workspace veya Okta ile tek parmak izi giriş sağlayın.
          Konfigürasyon 15 dakikada tamamlanır, IK-dışı bir SQL müdahalesine gerek yoktur.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ProviderCard
          name="Microsoft Entra ID (Azure AD)"
          icon="/brand/azure.svg"
          bullets={['SCIM provisioning', 'Grup → rol mapping', 'MFA desteklenir']}
        />
        <ProviderCard
          name="Google Workspace"
          icon="/brand/google.svg"
          bullets={['Tek tık SSO', 'Attribute mapping', 'Domain kısıtlı']}
        />
        <ProviderCard
          name="Okta / OneLogin / diğer"
          icon="/brand/saml.svg"
          bullets={['Generic SAML 2.0', 'Metadata XML import', 'Just-in-time provisioning']}
        />
      </div>

      <section className="rounded-xl border border-line bg-bg p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          <KeyRound className="h-3.5 w-3.5" />
          Kurulum Adımları
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] text-ink">
          <li>IdP tarafında yeni bir SAML uygulaması oluşturun</li>
          <li>ACS URL'i + Entity ID'yi Clerk'e yapıştırın (Enterprise connection)</li>
          <li>Firma email domain'ini ekleyin (ör. <code>acme.com</code>)</li>
          <li>IdP grup → UpCore rol eşlemesini ayarlayın (opsiyonel)</li>
          <li>Bir kullanıcıyla test edin — arka planda otomatik yönlendirme</li>
        </ol>
        <a
          href="https://docs.upcore.app/sso"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:border-ink-20"
        >
          Tam Rehber
          <ExternalLink className="h-3 w-3" />
        </a>
      </section>

      <section className="rounded-xl border border-line bg-bg p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          <Building2 className="h-3.5 w-3.5" />
          Mevcut Bağlantı
        </h2>
        <div className="mt-3 rounded-lg border border-dashed border-line bg-bg-2 p-4 text-center text-[13px] text-ink-60">
          SSO bağlantısı yapılandırılmamış.
          <br />
          Aktifleştirmek için{' '}
          <a href="mailto:satis@upcore.app" className="underline">
            satis@upcore.app
          </a>{' '}
          ile iletişime geçin veya{' '}
          <a href="https://docs.upcore.app/sso" className="underline" target="_blank" rel="noreferrer">
            self-service kurulum rehberini
          </a>{' '}
          takip edin.
        </div>
      </section>

      <div className="rounded-md border border-accent/30 bg-accent-soft p-3 text-[12px] text-accent">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">SCIM otomatik provisioning</p>
            <p className="mt-1 text-ink-80">
              Enterprise müşteriler için SCIM 2.0 ile Azure AD'den
              personel ekle/sil/güncellemeyi otomatikleştirebilirsiniz. Manuel davet
              gerektirmez.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderCard({
  name,
  bullets,
}: {
  name: string;
  icon?: string;
  bullets: string[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-bg p-4">
      <p className="text-sm font-semibold text-ink">{name}</p>
      <ul className="mt-1 space-y-1 text-[12px] text-ink-60">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-1.5">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
