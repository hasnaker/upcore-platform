'use client';

import Link from 'next/link';
import {
  AlertCircle, Bell, Building2, ChevronRight, CreditCard, FileText,
  Loader2, Package, Settings2, Shield, Users,
} from 'lucide-react';
import { useSGKWorkplace, useBordroSettings } from '@/hooks/useBordro';
import { useMyNotificationPreferences } from '@/hooks/useNotifications';
import { useTenantModules } from '@/hooks/useTenantModules';

/**
 * Canlı Ayarlar Merkezi — tüm tenant-level konfigürasyonları tek ekranda
 * özetler ve her birinin tam yönetim sayfasına bağlantı sunar.
 */
export default function AyarlarCanliPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          <Settings2 className="h-6 w-6 text-[#5E5CE6]" />
          Tenant Ayarları
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Kurum düzeyindeki tüm konfigürasyonlar ve modül durumları tek bakışta.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <WorkplaceCard />
        <BordroSettingsCard />
        <NotificationPrefCard />
        <AuditSummaryLinkCard />
      </div>

      <ModulesSection />
    </div>
  );
}

/* ─── Workplace ─── */

function WorkplaceCard() {
  const q = useSGKWorkplace();
  const status = q.isLoading
    ? 'Yükleniyor…'
    : q.data
      ? `Tanımlı — Sicil: ${q.data.sicil_no}`
      : 'Henüz tanımlı değil';
  const tone = q.data ? 'success' : 'warning';

  return (
    <SettingCard
      icon={<Building2 className="h-5 w-5" />}
      title="SGK İşyeri"
      status={status}
      tone={tone}
      href="/bordro/canli"
      linkLabel="Yönet"
    >
      {q.data ? (
        <ul className="mt-2 space-y-1 text-xs text-[#525252]">
          <li><span className="text-[#737373]">Ünvan: </span>{q.data.unvan}</li>
          <li><span className="text-[#737373]">Vergi No: </span>{q.data.vergi_no}</li>
          {q.data.il ? <li><span className="text-[#737373]">İl/İlçe: </span>{q.data.il}/{q.data.ilce ?? '—'}</li> : null}
          <li><span className="text-[#737373]">Kanun Türü: </span>{q.data.kanun_turu}</li>
        </ul>
      ) : (
        <p className="mt-2 text-xs text-[#737373]">
          SGK APB/İGB/İAB üretimi için işyeri sicil no + vergi no + unvan gerekli.
        </p>
      )}
    </SettingCard>
  );
}

/* ─── Bordro ayarları ─── */

function BordroSettingsCard() {
  const q = useBordroSettings();
  const tone = q.isError ? 'warning' : 'neutral';

  return (
    <SettingCard
      icon={<CreditCard className="h-5 w-5" />}
      title="Bordro Parametreleri"
      status={q.isLoading ? 'Yükleniyor…' : q.data ? 'Yapılandırıldı' : 'Varsayılanlar'}
      tone={tone}
      href="/bordro/canli"
      linkLabel="Düzenle"
    >
      {q.data ? (
        <ul className="mt-2 space-y-1 text-xs text-[#525252]">
          <li>
            <span className="text-[#737373]">Saatlik ücret tabanı: </span>
            {q.data.hours_per_month} saat/ay
          </li>
          <li>
            <span className="text-[#737373]">Yemek günlük brüt: </span>
            {q.data.meal_daily_gross.toFixed(2)} TL
            <span className="ml-1 text-[#737373]">(istisna {q.data.meal_exempt_daily.toFixed(2)} TL)</span>
          </li>
          <li>
            <span className="text-[#737373]">Yol günlük brüt: </span>
            {q.data.transport_daily_gross.toFixed(2)} TL
            <span className="ml-1 text-[#737373]">(istisna {q.data.transport_exempt_daily.toFixed(2)} TL)</span>
          </li>
          <li>
            <span className="text-[#737373]">Asgari ücret istisnası: </span>
            <StatusPill on={q.data.apply_min_wage_exemption} onLabel="Açık" offLabel="Kapalı" />
          </li>
        </ul>
      ) : (
        <p className="mt-2 text-xs text-[#737373]">
          Yemek/yol istisna tavanları (GVK Mük.67 + 61/f) ayarlanmadan hesaplama varsayılan tavanı kullanır.
        </p>
      )}
    </SettingCard>
  );
}

/* ─── Notification preferences ─── */

function NotificationPrefCard() {
  const q = useMyNotificationPreferences();
  const activeChannels = q.data
    ? [
        q.data.email_enabled ? 'E-posta' : null,
        q.data.sms_enabled ? 'SMS' : null,
        q.data.inapp_enabled ? 'Uygulama İçi' : null,
      ].filter(Boolean).join(' · ') || 'Hiçbiri'
    : '—';

  return (
    <SettingCard
      icon={<Bell className="h-5 w-5" />}
      title="Bildirim Tercihlerim"
      status={q.isLoading ? 'Yükleniyor…' : `Aktif kanal: ${activeChannels}`}
      tone={q.data && (q.data.email_enabled || q.data.inapp_enabled) ? 'success' : 'warning'}
      href="/bildirimler"
      linkLabel="Düzenle"
    >
      {q.data && (q.data.quiet_hours_start || q.data.quiet_hours_end) ? (
        <p className="mt-2 text-xs text-[#737373]">
          Sessiz saatler: {q.data.quiet_hours_start ?? '—'} → {q.data.quiet_hours_end ?? '—'}
        </p>
      ) : null}
      {q.error ? (
        <p className="mt-2 text-xs text-[#DC2626]">
          <AlertCircle className="mr-1 inline h-3 w-3" />
          Tercih yüklenemedi: {q.error.message}
        </p>
      ) : null}
    </SettingCard>
  );
}

/* ─── Audit link ─── */

function AuditSummaryLinkCard() {
  return (
    <SettingCard
      icon={<Shield className="h-5 w-5" />}
      title="Denetim Kaydı"
      status="KVKK uyumlu event stream"
      tone="neutral"
      href="/denetim"
      linkLabel="Görüntüle"
    >
      <p className="mt-2 text-xs text-[#737373]">
        Tenant içindeki tüm kritik aksiyonlar — tarihsel denetim, kaynak geçmişi, CSV export.
      </p>
    </SettingCard>
  );
}

/* ─── Modules section ─── */

function ModulesSection() {
  const q = useTenantModules();

  if (q.isLoading) {
    return (
      <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
          <Package className="h-4 w-4" />
          Modüller
        </h2>
        <div className="mt-4 flex items-center gap-2 text-xs text-[#737373]">
          <Loader2 className="h-3 w-3 animate-spin" /> Yükleniyor…
        </div>
      </section>
    );
  }

  if (q.error) {
    return (
      <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
          <Package className="h-4 w-4" />
          Modüller
        </h2>
        <div className="mt-3 flex items-start gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-[12px] text-[#991B1B]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Modül bilgisi yüklenemedi: {q.error.message}</span>
        </div>
      </section>
    );
  }

  const byCategory = groupBy(q.data?.modules ?? [], (m) => m.category);
  const order: Array<{
    key: 'kazanim' | 'surdurme' | 'gelistirme' | 'yerlestirme' | 'koruma';
    label: string;
  }> = [
    { key: 'kazanim', label: 'Kazanım' },
    { key: 'yerlestirme', label: 'Yerleştirme' },
    { key: 'surdurme', label: 'Sürdürme' },
    { key: 'gelistirme', label: 'Geliştirme' },
    { key: 'koruma', label: 'Koruma' },
  ];

  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
            <Package className="h-4 w-4" />
            Modüller
          </h2>
          <p className="text-xs text-[#737373]">
            Plan: <span className="font-medium text-[#0A0A0A]">{q.data?.plan_tier ?? '—'}</span>
            {' · '}Aktif: {q.data?.active_count ?? 0} / {q.data?.modules.length ?? 0}
          </p>
        </div>
        <Link
          href="/entegrasyonlar"
          className="inline-flex items-center gap-1 text-xs text-[#5E5CE6] hover:underline"
        >
          Plan değiştir <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        {order.map((cat) => {
          const modules = byCategory[cat.key] ?? [];
          if (modules.length === 0) return null;
          return (
            <div key={cat.key}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                {cat.label}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-3 ${
                      m.active ? 'border-[#BBF7D0] bg-[#F0FDF4]' : 'border-[#EDEDED] bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-[#0A0A0A]">{m.name_tr}</p>
                      <StatusPill on={m.active} onLabel="Aktif" offLabel="Kapalı" />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-[#525252]">{m.description_tr}</p>
                    {m.price_monthly_try != null ? (
                      <p className="mt-2 text-[11px] font-medium text-[#737373]">
                        {m.price_monthly_try.toLocaleString('tr-TR')} TL/ay
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── shared UI ─── */

interface SettingCardProps {
  icon: React.ReactNode;
  title: string;
  status: string;
  tone: 'neutral' | 'success' | 'warning';
  href?: string;
  linkLabel?: string;
  children?: React.ReactNode;
}

function SettingCard({ icon, title, status, tone, href, linkLabel, children }: SettingCardProps) {
  const toneCls =
    tone === 'success'
      ? 'bg-[#DCFCE7] text-[#14532D]'
      : tone === 'warning'
        ? 'bg-[#FEF3C7] text-[#92400E]'
        : 'bg-[#EEF2FF] text-[#5E5CE6]';

  return (
    <article className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#525252]">
            {icon}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[#0A0A0A]">{title}</h3>
            <p className="mt-0.5 text-xs text-[#737373]">{status}</p>
          </div>
        </div>
        {href && linkLabel ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 rounded-md border border-[#EDEDED] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]"
          >
            {linkLabel}
            <ChevronRight className="h-3 w-3" />
          </Link>
        ) : null}
      </header>
      {children ? (
        <div className={`mt-3 rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider inline-block ${toneCls}`}>
          {tone === 'success' ? 'OK' : tone === 'warning' ? 'Dikkat' : 'Bilgi'}
        </div>
      ) : null}
      {children}
    </article>
  );
}

function StatusPill({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        on ? 'bg-[#DCFCE7] text-[#14532D]' : 'bg-[#F5F5F5] text-[#737373]'
      }`}
    >
      {on ? onLabel : offLabel}
    </span>
  );
}

function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of arr) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

// Silence unused import when icons get refactored.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unused = [FileText, Users];
