'use client';

import Link from 'next/link';
import {
  Brain,
  Calendar,
  FileText,
  Shield,
  Sparkles,
  Target,
  User,
  Wallet,
} from 'lucide-react';
import { useAuthMe } from '@/hooks/useAuthMe';
import { useT } from '@/hooks/useLocale';

const CARDS = [
  { href: '/portal/bordrolar', labelKey: 'portal.my_slips', icon: Wallet, desc: 'Son 12 ay bordro zarfları — PDF indir' },
  { href: '/portal/izin', labelKey: 'portal.my_leave', icon: Calendar, desc: 'Yıllık / mazeret izinlerini gör ve talep et' },
  { href: '/portal/degerlendirme', labelKey: 'portal.my_assessments', icon: Target, desc: 'Performans + kompetans geri bildirimleri' },
  { href: '/portal/belgeler', labelKey: 'portal.my_documents', icon: FileText, desc: 'İş sözleşmesi, banka mektubu, kimlik kopyası' },
  { href: '/portal/kvkk-consent-manager', labelKey: 'portal.my_consents', icon: Shield, desc: 'KVKK rıza yönetimi — veri işleme, AI kararları, analitik' },
  { href: '/portal/ml-itiraz', labelKey: 'portal.my_ml_objections', icon: Brain, desc: 'ML tahmin geçmişin + SHAP açıklaması + KVKK Madde 22 itiraz' },
  { href: '/portal/upcap', labelKey: 'portal.my_upcap', icon: Sparkles, desc: 'UpCap-TR psikolojik sermaye skorun — percentile + sektör karşılaştırma' },
];

export default function ChalisanPortalPage() {
  const me = useAuthMe();
  const t = useT();

  if (me.isLoading) {
    return (
      <div className="h-48 animate-pulse rounded-xl border border-line bg-bg" />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4 rounded-xl border border-line bg-bg p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
          {(me.firstName[0] ?? '?').toUpperCase()}
          {(me.lastName[0] ?? '?').toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-ink">
            {t('portal.welcome', { name: me.firstName || 'çalışan' })}
          </h1>
          <p className="mt-1 text-sm text-ink-60">
            Kendi bordro, izin ve değerlendirmelerine buradan ulaşabilirsin. Yöneticinin
            gördüğü panellere erişmen kısıtlıdır.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(me.roles ?? []).map((r) => (
              <span
                key={r}
                className="inline-flex h-5 items-center rounded-full bg-bg-2 px-2 text-[10px] font-medium text-ink-60"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {CARDS.map(({ href, labelKey, icon: Icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 rounded-xl border border-line bg-bg p-4 transition-colors hover:border-accent/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{t(labelKey)}</p>
              <p className="mt-0.5 text-[12px] text-ink-60">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 text-[12px] text-accent">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Bilim-temelli tükenmişlik takibi</p>
          <p className="mt-1 text-ink-80">
            Şirketin BAT-TR + COPSOQ anketlerini dolduruyorsan sonuçlarını{' '}
            <Link href="/degerlendirmeler/canli" className="underline">
              Değerlendirmelerim
            </Link>{' '}
            sayfasından görebilirsin. Yanıtların anonim biçimde yöneticine değil, bilim
            ekibine gönderilir.
          </p>
        </div>
      </div>

      {/* Profil Özet */}
      <div className="rounded-xl border border-line bg-bg p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          <User className="h-3.5 w-3.5" />
          Profil Özeti
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
          <InfoRow label="Ad Soyad" value={me.fullName || '—'} />
          <InfoRow label="Email" value={me.email || '—'} />
          <InfoRow label="Organizasyon" value={me.tenantId ? 'Kayıtlı' : '—'} />
          <InfoRow label="Roller" value={(me.roles ?? []).join(', ') || 'employee'} />
        </div>
      </div>
    </div>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-bg-2 p-3">
    <p className="text-[10px] uppercase tracking-widest text-ink-40">{label}</p>
    <p className="mt-0.5 truncate text-sm font-medium text-ink">{value}</p>
  </div>
);
