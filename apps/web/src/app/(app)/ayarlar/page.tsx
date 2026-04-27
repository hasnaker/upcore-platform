'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Briefcase,
  Building2,
  CheckCircle2,
  CreditCard,
  Key,
  LogOut,
  Mail,
  Settings,
  Shield,
  Sparkles,
  User as UserIcon,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser, useClerk } from '@clerk/nextjs';
import { useAuthMe } from '@/hooks/useAuthMe';
import { useTenantModules } from '@/hooks/useTenantModules';
import { useLocale } from '@/hooks/useLocale';

type Section = 'profil' | 'sirket' | 'moduller' | 'bildirimler' | 'abonelik' | 'kvkk';

const SECTIONS: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: 'profil', label: 'Profil', icon: UserIcon },
  { key: 'sirket', label: 'Şirket', icon: Building2 },
  { key: 'moduller', label: 'Modüller', icon: Sparkles },
  { key: 'bildirimler', label: 'Bildirimler', icon: Bell },
  { key: 'abonelik', label: 'Abonelik', icon: CreditCard },
  { key: 'kvkk', label: 'KVKK & Güvenlik', icon: Shield },
];

export default function AyarlarPage() {
  const [section, setSection] = useState<Section>('profil');

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Ayarlar</h1>
        <p className="mt-1 text-sm text-ink-60">
          Profil, şirket, modül açma/kapama, bildirim tercihleri ve KVKK yönetimi.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar nav */}
        <nav className="flex flex-row gap-1 overflow-x-auto rounded-lg border border-line bg-bg p-1 text-[13px] lg:flex-col">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`flex shrink-0 items-center gap-2 rounded px-3 py-2 font-medium transition-colors lg:justify-start ${
                section === key
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-60 hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {section === 'profil' && <ProfilSection />}
          {section === 'sirket' && <SirketSection />}
          {section === 'moduller' && <ModullerSection />}
          {section === 'bildirimler' && <BildirimSection />}
          {section === 'abonelik' && <AbonelikSection />}
          {section === 'kvkk' && <KvkkSection />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

const ProfilSection = () => {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const me = useAuthMe();
  const { locale, setLocale } = useLocale();

  if (!isLoaded || me.isLoading) {
    return <div className="h-48 animate-pulse rounded-lg border border-line bg-bg" />;
  }

  const signOut = async () => {
    await clerk.signOut();
    window.location.href = '/giris';
  };

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-line bg-bg p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">Profil</h2>

      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
          {(me.firstName[0] ?? '?').toUpperCase()}
          {(me.lastName[0] ?? '?').toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold text-ink">
            {me.fullName || user?.fullName || '—'}
          </p>
          <p className="flex items-center gap-1 text-[12px] text-ink-60">
            <Mail className="h-3 w-3" />
            {me.email || user?.primaryEmailAddress?.emailAddress}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {me.roles.map((r) => (
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

      <div className="flex items-center justify-between border-t border-line pt-4">
        <span className="text-[11px] font-medium uppercase tracking-widest text-ink-40">Dil · Language</span>
        <div className="flex gap-1 rounded-md border border-line bg-bg-2 p-0.5">
          {(['tr', 'en'] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => {
                setLocale(loc);
                toast.success(loc === 'tr' ? 'Dil Türkçe olarak ayarlandı' : 'Language set to English');
                setTimeout(() => window.location.reload(), 300);
              }}
              className={`rounded px-3 py-1 text-[11px] font-medium transition-colors ${
                locale === loc
                  ? 'bg-bg text-ink shadow-sm'
                  : 'text-ink-60 hover:text-ink'
              }`}
            >
              {loc === 'tr' ? 'Türkçe' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Link
          href="/user-profile"
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-4 py-2 text-[13px] font-medium text-ink-60 hover:border-ink-20"
        >
          <Settings className="h-3.5 w-3.5" />
          Clerk profil ayarları
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-1.5 rounded-md border border-red/30 bg-red-soft px-4 py-2 text-[13px] font-medium text-red hover:bg-red-soft/80"
        >
          <LogOut className="h-3.5 w-3.5" />
          Çıkış Yap
        </button>
      </div>

      <p className="text-[11px] text-ink-40">
        Profil resmi, 2FA ve oturum yönetimi için Clerk profil ayarlarını kullanın.
      </p>
    </section>
  );
};

const SirketSection = () => {
  const modules = useTenantModules();
  if (modules.isLoading) {
    return <div className="h-48 animate-pulse rounded-lg border border-line bg-bg" />;
  }
  return (
    <section className="flex flex-col gap-5 rounded-xl border border-line bg-bg p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
        Şirket Bilgileri
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow label="Plan" value={modules.data?.plan_tier?.toUpperCase() ?? '—'} />
        <InfoRow
          label="Aktif modül"
          value={`${modules.data?.active_count ?? 0}/${modules.data?.modules?.length ?? 5}`}
        />
      </div>
      <p className="text-[11px] text-ink-40">
        Şirket adı, VKN, adres ve logo düzenlemesi için Admin Panel gerekli — Faz 8'de aktif
        olacak.
      </p>
    </section>
  );
};

const ModullerSection = () => {
  const modules = useTenantModules();
  if (modules.isLoading) {
    return <div className="h-48 animate-pulse rounded-lg border border-line bg-bg" />;
  }
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-bg p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
        Modüller
      </h2>
      <div className="flex flex-col gap-2">
        {(modules.data?.modules ?? []).map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-lg border border-line bg-bg p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft">
                <Briefcase className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{m.name_tr}</p>
                <p className="text-[11px] text-ink-40">
                  {m.description_tr.slice(0, 80)}
                  {m.description_tr.length > 80 ? '…' : ''}
                </p>
              </div>
            </div>
            {m.active ? (
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-green-soft px-2 text-[11px] font-medium text-green">
                <CheckCircle2 className="h-3 w-3" />
                Aktif
              </span>
            ) : (
              <Link
                href={`/moduller/${m.category}`}
                className="inline-flex h-7 items-center rounded-md border border-accent/30 bg-accent-soft px-2.5 text-[11px] font-medium text-accent hover:bg-accent-soft/80"
              >
                Aktifleştir →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

const BildirimSection = () => {
  const [prefs, setPrefs] = useState({
    email_daily_digest: true,
    email_critical_alerts: true,
    email_weekly_recap: true,
    in_app_all: true,
  });

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-bg p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
        Bildirim Tercihleri
      </h2>
      <div className="flex flex-col gap-3">
        <ToggleRow
          label="Günlük özet e-postası"
          desc="Sabah 09:00 — günün 5 aksiyonu + haftalık metrikler"
          checked={prefs.email_daily_digest}
          onChange={(v) => setPrefs({ ...prefs, email_daily_digest: v })}
        />
        <ToggleRow
          label="Kritik uyarı e-postaları"
          desc="BAT-TR kırmızı band, istifa riski, SLA aşımı — anlık"
          checked={prefs.email_critical_alerts}
          onChange={(v) => setPrefs({ ...prefs, email_critical_alerts: v })}
        />
        <ToggleRow
          label="Haftalık recap e-postası"
          desc="Pazartesi sabahı — geçen haftanın özeti + bu hafta öncelikleri"
          checked={prefs.email_weekly_recap}
          onChange={(v) => setPrefs({ ...prefs, email_weekly_recap: v })}
        />
        <ToggleRow
          label="Uygulama içi bildirimler"
          desc="Sağ üstteki bildirim ikonunda tüm aksiyonlar"
          checked={prefs.in_app_all}
          onChange={(v) => setPrefs({ ...prefs, in_app_all: v })}
        />
      </div>
      <div className="flex items-center justify-end border-t border-line pt-4">
        <button
          type="button"
          onClick={() => toast.success('Bildirim tercihleri kaydedildi')}
          className="rounded-md bg-accent px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-accent/90"
        >
          Tercihleri Kaydet
        </button>
      </div>
      <p className="text-[11px] text-ink-40">
        Notification service ile persistent kayıt Faz 11'de aktif olacak. Şimdilik tercihler
        tarayıcıda tutulur.
      </p>
    </section>
  );
};

const AbonelikSection = () => {
  const modules = useTenantModules();
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-bg p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
        Abonelik
      </h2>
      <div className="flex items-start gap-3 rounded-lg bg-accent-soft p-4">
        <CreditCard className="h-5 w-5 text-accent" />
        <div>
          <p className="text-base font-semibold text-ink">
            {modules.data?.plan_tier?.toUpperCase() ?? 'TRIAL'} planı
          </p>
          <p className="mt-1 text-[12px] text-ink-60">
            {modules.data?.active_count ?? 0} modül aktif. Planı yükseltmek veya fatura
            detayları için UpCore hesap yöneticinize ulaşın.
          </p>
        </div>
      </div>
      <InfoRow label="Fatura e-postası" value="Clerk organization admin" />
      <InfoRow label="Ödeme sıklığı" value="Aylık (Iyzico / Stripe)" />
      <a
        href="mailto:satis@upcore.app"
        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
      >
        <Mail className="h-3.5 w-3.5" />
        Plan görüşmesi talep et
      </a>
    </section>
  );
};

const KvkkSection = () => (
  <section className="flex flex-col gap-4 rounded-xl border border-line bg-bg p-6">
    <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
      KVKK &amp; Güvenlik
    </h2>
    <Link
      href="/ayarlar/dlq"
      className="flex items-start gap-3 rounded-lg border border-amber/30 bg-amber-soft p-3 text-[12px] text-amber hover:bg-amber-soft/80"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Transactional Outbox · Dead Letter Queue</p>
        <p className="mt-0.5 text-ink-80">
          Broker'a teslim edilemeyen event'leri görüntüle ve manuel olarak yeniden kuyruğa al.
          Retry + circuit breaker sonrası kalıcı hataların operatör paneli.
        </p>
      </div>
    </Link>
    <Link
      href="/ayarlar/api-keys"
      className="flex items-start gap-3 rounded-lg border border-line bg-bg-2 p-3 text-[12px] text-ink-60 hover:border-ink-20"
    >
      <Key className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <div className="flex-1">
        <p className="font-semibold text-ink">API Anahtarları</p>
        <p className="mt-0.5 text-ink-80">
          Public API entegrasyonları için scope tabanlı anahtar üretin. Rate limit dakika başıdır,
          tam anahtar yalnızca bir kez gösterilir.
        </p>
      </div>
    </Link>
    <Link
      href="/ayarlar/webhooks"
      className="flex items-start gap-3 rounded-lg border border-line bg-bg-2 p-3 text-[12px] text-ink-60 hover:border-ink-20"
    >
      <Webhook className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <div className="flex-1">
        <p className="font-semibold text-ink">Webhook Abonelikleri</p>
        <p className="mt-0.5 text-ink-80">
          HR event'lerini HTTPS endpoint'inize iletin (HMAC-SHA256 imzalı). Başarısız teslimler 6
          kez retry, ardından otomatik pasifleşir.
        </p>
      </div>
    </Link>
    <Link
      href="/ayarlar/saga"
      className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-soft p-3 text-[12px] text-accent hover:bg-accent-soft/80"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Saga Orchestrator</p>
        <p className="mt-0.5 text-ink-80">
          Cross-service iş akışlarını izle: running/failed instance'ları listele, adım günlüğünü
          incele, hatalı saga'yı Retry ile yeniden çalıştır.
        </p>
      </div>
    </Link>
    <div className="grid gap-3 sm:grid-cols-2">
      <InfoRow label="Veri bölgesi" value="Azure TR Central (İstanbul)" />
      <InfoRow label="Aydınlatma metni" value="KVKK uyumlu — v2.1" />
      <InfoRow label="Veri saklama süresi" value="Aktif çalışan süresi + 10 yıl" />
      <InfoRow label="Şifreleme" value="AES-256 (at rest) · TLS 1.3 (transit)" />
      <InfoRow label="Audit log" value="Immutable, 7 yıl" />
      <InfoRow label="Pseudonymization" value="TCKN field-level encrypted (pgcrypto)" />
    </div>
    <div className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber-soft p-3 text-[12px] text-amber">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">Veri ihracı talebi</p>
        <p className="mt-1 text-ink-80">
          KVKK 11. madde kapsamında verilerinizin silinmesini, düzeltilmesini veya bir kopyasını
          talep etmek için <a href="mailto:kvkk@upcore.app" className="underline">kvkk@upcore.app</a>
          adresine e-posta gönderin. 30 gün içinde yanıtlanır.
        </p>
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════════════════

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-bg-2 p-3">
    <p className="text-[10px] uppercase tracking-widest text-ink-40">{label}</p>
    <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
  </div>
);

const ToggleRow = ({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex items-start gap-3 rounded-md border border-line bg-bg p-3 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 accent-[color:var(--color-accent)]"
    />
    <div className="flex-1">
      <p className="text-[13px] font-medium text-ink">{label}</p>
      <p className="text-[11px] text-ink-40">{desc}</p>
    </div>
  </label>
);

// unused memo to avoid lint
void useMemo;
