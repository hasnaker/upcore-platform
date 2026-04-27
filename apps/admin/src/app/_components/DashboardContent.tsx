'use client';

import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  Building2,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';

// Backend'de admin-specific endpoint'ler yok — şimdilik sabit/sim veri.
// Gerçek canlılaştırma için /api/v1/admin/* route grubu tenant service'e eklenecek.
const STATS = [
  { icon: Building2, label: 'Aktif Tenant', value: 23, delta: '+3 bu ay', tone: 'accent' },
  { icon: Users, label: 'Toplam Kullanıcı', value: '4.812', delta: '+12% MoM', tone: 'green' },
  { icon: DollarSign, label: 'MRR (TL)', value: '₺ 1.34M', delta: '+%18 MoM', tone: 'green' },
  { icon: Activity, label: 'Servis Sağlığı', value: '18/18', delta: 'hepsi yeşil', tone: 'green' },
];

const RECENT = [
  { tenant: 'Samsun Büyükşehir', action: 'Pilot başladı', time: '2 saat önce', type: 'success' as const },
  { tenant: 'Koç Holding', action: 'Plan yükseltme talebi', time: '5 saat önce', type: 'info' as const },
  { tenant: 'Acme A.Ş.', action: 'Ödeme başarısız', time: '1 gün önce', type: 'error' as const },
  { tenant: 'Demo Tenant', action: 'Deneme süresi bitiyor (3 gün)', time: '1 gün önce', type: 'warning' as const },
];

const QUICK_LINKS = [
  { href: '/billing', label: 'Billing panosu', desc: 'MRR, faturalar, Stripe portal' },
  { href: '/tenants', label: 'Yeni tenant ekle', desc: 'Manuel onboarding' },
  { href: '/users', label: 'Kullanıcı ara', desc: 'Tüm tenantlarda' },
  { href: '/flags', label: 'Feature flag yönet', desc: 'Tenant-bazlı override' },
];

export function DashboardContent() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-60">
          UpCore platform genel durum — tenant, billing, infrastructure.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-line bg-bg p-5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-40">
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{s.value}</p>
              <p
                className={`mt-1 text-[11px] ${
                  s.tone === 'green' ? 'text-green' : 'text-accent'
                }`}
              >
                {s.delta}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Recent activity */}
        <section className="rounded-xl border border-line bg-bg">
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
              Son Aktiviteler
            </h2>
            <Link
              href="/audit"
              className="text-[11px] font-medium text-accent hover:underline"
            >
              Tam audit log →
            </Link>
          </header>
          <div className="divide-y divide-line">
            {RECENT.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    r.type === 'success'
                      ? 'bg-green'
                      : r.type === 'error'
                        ? 'bg-red'
                        : r.type === 'warning'
                          ? 'bg-amber'
                          : 'bg-accent'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{r.tenant}</p>
                  <p className="text-[12px] text-ink-60">{r.action}</p>
                </div>
                <span className="shrink-0 text-[11px] text-ink-40">{r.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick links */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
            Hızlı İşlemler
          </h2>
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex flex-col gap-0.5 rounded-lg border border-line bg-bg p-4 transition-colors hover:border-accent"
            >
              <span className="text-sm font-semibold text-ink">{q.label}</span>
              <span className="text-[11px] text-ink-40">{q.desc}</span>
            </Link>
          ))}
        </section>
      </div>

      {/* Dev note */}
      <div className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber-soft p-3 text-[11px] text-amber">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <p className="font-semibold">Development note</p>
          <p className="mt-0.5 text-ink-80">
            Admin API endpoint&apos;leri (tenant service
            <code className="rounded bg-bg-2 px-1">/api/v1/admin/*</code>) henüz canlı
            değil — şu an demo veri gösteriliyor. Production&apos;da tenant service&apos;te
            admin role middleware ile korunmuş yeni route group açılacak.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-ink-40">
        <TrendingUp className="h-3 w-3" />
        MoM: Month-over-Month · Metrikler gerçek zamanlı değil (cache 5dk)
      </div>
    </div>
  );
}
