'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Brain, BellRing, CalendarCheck2,
  ClipboardCheck, Flame, Heart, Loader2, ShieldCheck, Sparkles, Users,
} from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import {
  useBurnoutHeatmap,
  useCriticalEmployees,
  type CriticalEmployee,
} from '@/hooks/useBurnout';
import { useLeaveRequests } from '@/hooks/useLeaves';
import { useAssessments } from '@/hooks/useAssessments';
import { useAuditStats } from '@/hooks/useAudit';
import { usePriorityActions, useWeeklyRecap, type RankedAction } from '@/hooks/useActions';
import { usePerformanceCycles } from '@/hooks/usePerformance';

/**
 * Canlı Executive Dashboard — tüm modüllerden gerçek veriyi gateway üzerinden
 * aggregate eder. Fallback mock YOK; her metrik kaynak gösterir.
 */
export default function ExecutiveCanliPage() {
  const employees = useEmployees({ page: 1, limit: 1 }); // sadece total için
  const heatmap = useBurnoutHeatmap(4);
  const critical = useCriticalEmployees(5);
  const pending = useLeaveRequests({ status: 'pending', limit: 100 });
  const recentAssessments = useAssessments({ status: 'scored' });
  const audit = useAuditStats('7d');
  const actions = usePriorityActions();
  const recap = useWeeklyRecap('7d');
  const cycles = usePerformanceCycles('active');

  const totalEmployees = employees.data?.total ?? 0;
  const burnoutRedPct = useMemo(() => {
    const cells = heatmap.data?.cells ?? [];
    const scored = cells.filter((c) => typeof c.avg_score === 'number') as Array<{
      avg_score: number;
    }>;
    if (scored.length === 0) return null;
    const avg = scored.reduce((acc, r) => acc + r.avg_score, 0) / scored.length;
    const redRows = scored.filter((r) => r.avg_score >= 3.02).length;
    return { avg, redPct: (redRows / scored.length) * 100 };
  }, [heatmap.data]);

  const pendingLeaves = pending.data?.items?.length ?? 0;
  const scoredCount = recentAssessments.data?.total ?? recentAssessments.data?.items.length ?? 0;
  const criticalAuditCount =
    (audit.data?.by_severity?.['critical'] ?? 0) + (audit.data?.by_severity?.['error'] ?? 0);
  const activeCycles = cycles.data?.items?.length ?? 0;
  const criticalItems: CriticalEmployee[] = critical.data?.items ?? [];
  const topActions: RankedAction[] = actions.data?.actions ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          <Sparkles className="h-6 w-6 text-[#5E5CE6]" />
          Canlı Yönetim Paneli
        </h1>
        <p className="mt-1 text-sm text-[#737373]">
          Tüm modüllerden gerçek zamanlı sinyal birleşimi — kurum sağlığınızın anlık özeti.
        </p>
      </header>

      {/* KPI Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Toplam Çalışan"
          value={totalEmployees.toLocaleString('tr-TR')}
          loading={employees.isLoading}
          tone="neutral"
          href="/calisanlar"
        />
        <KpiCard
          icon={<Flame className="h-4 w-4" />}
          label="Tükenmişlik (son 4 hafta)"
          value={
            burnoutRedPct === null
              ? '—'
              : `${burnoutRedPct.redPct.toFixed(0)}% kırmızı · ort. ${burnoutRedPct.avg.toFixed(2)}`
          }
          loading={heatmap.isLoading}
          tone={burnoutRedPct && burnoutRedPct.redPct > 20 ? 'danger' : burnoutRedPct && burnoutRedPct.redPct > 0 ? 'warning' : 'success'}
          href="/tukenmislik"
        />
        <KpiCard
          icon={<CalendarCheck2 className="h-4 w-4" />}
          label="Bekleyen İzin Talebi"
          value={pendingLeaves.toLocaleString('tr-TR')}
          loading={pending.isLoading}
          tone={pendingLeaves > 10 ? 'warning' : 'neutral'}
          href="/izinler"
        />
        <KpiCard
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Skorlanmış Değerlendirme"
          value={scoredCount.toLocaleString('tr-TR')}
          loading={recentAssessments.isLoading}
          tone="neutral"
          href="/degerlendirmeler/canli"
        />
        <KpiCard
          icon={<Brain className="h-4 w-4" />}
          label="Aktif Performans Dönemi"
          value={activeCycles.toLocaleString('tr-TR')}
          loading={cycles.isLoading}
          tone="neutral"
          href="/performans/canli"
        />
        <KpiCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="7g Kritik/Hata Olayları"
          value={criticalAuditCount.toLocaleString('tr-TR')}
          loading={audit.isLoading}
          tone={criticalAuditCount > 0 ? 'danger' : 'success'}
          href="/denetim"
        />
        <KpiCard
          icon={<BellRing className="h-4 w-4" />}
          label="Size Özel Aksiyonlar"
          value={(actions.data?.actions.length ?? 0).toString()}
          loading={actions.isLoading}
          tone="accent"
          href="/aksiyonlar/canli"
        />
        <KpiCard
          icon={<Heart className="h-4 w-4" />}
          label="Kritik Risk Çalışan"
          value={criticalItems.length.toString()}
          loading={critical.isLoading}
          tone={criticalItems.length > 0 ? 'danger' : 'success'}
          href="/tukenmislik"
        />
      </section>

      {/* Secondary panels */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <RecapPanel data={recap.data} loading={recap.isLoading} />
        <CriticalPanel items={criticalItems} loading={critical.isLoading} />
      </div>

      <TopActionsPanel actions={topActions} loading={actions.isLoading} />
    </div>
  );
}

/* ─── KPI Card ─── */

type KpiTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

function KpiCard({
  icon, label, value, loading, tone, href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  tone: KpiTone;
  href?: string;
}) {
  const toneCls = toneCss(tone);
  const Inner = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
          {label}
        </span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${toneCls.iconBg} ${toneCls.iconText}`}>
          {icon}
        </span>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-[#737373]" />
      ) : (
        <p className="text-2xl font-semibold tabular-nums text-[#0A0A0A]">{value}</p>
      )}
    </div>
  );
  const body = (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        href ? 'hover:border-[#5E5CE6] hover:bg-[#FAFAFA] cursor-pointer' : ''
      } ${toneCls.border}`}
    >
      {Inner}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function toneCss(t: KpiTone) {
  switch (t) {
    case 'success':
      return {
        border: 'border-[#BBF7D0] bg-[#F0FDF4]',
        iconBg: 'bg-[#DCFCE7]',
        iconText: 'text-[#16A34A]',
      };
    case 'warning':
      return {
        border: 'border-[#FDE68A] bg-[#FFFBEB]',
        iconBg: 'bg-[#FEF3C7]',
        iconText: 'text-[#D97706]',
      };
    case 'danger':
      return {
        border: 'border-[#FECACA] bg-[#FEF2F2]',
        iconBg: 'bg-[#FEE2E2]',
        iconText: 'text-[#DC2626]',
      };
    case 'accent':
      return {
        border: 'border-[#C7D2FE] bg-[#EEF2FF]',
        iconBg: 'bg-[#E0E7FF]',
        iconText: 'text-[#5E5CE6]',
      };
    default:
      return {
        border: 'border-[#EDEDED] bg-white',
        iconBg: 'bg-[#F5F5F5]',
        iconText: 'text-[#525252]',
      };
  }
}

/* ─── Recap panel ─── */

function RecapPanel({
  data,
  loading,
}: {
  data: ReturnType<typeof useWeeklyRecap>['data'];
  loading: boolean;
}) {
  const metrics = data?.metrics ?? [];
  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <h2 className="text-sm font-semibold text-[#0A0A0A]">Bu hafta</h2>
      <p className="text-xs text-[#737373]">Action Center haftalık özet — son 7 gün</p>
      {loading ? (
        <Loading />
      ) : metrics.length === 0 ? (
        <Empty hint="Henüz özet veri yok" icon={<Sparkles className="h-6 w-6 text-[#A3A3A3]" />} />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => {
            const up = m.change_vs_prev > 0;
            const down = m.change_vs_prev < 0;
            return (
              <div key={m.key} className="rounded-lg border border-[#EDEDED] p-3">
                <p className="text-[11px] uppercase tracking-wider text-[#737373]">{m.label_tr}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[#0A0A0A]">{m.value}</p>
                {m.change_vs_prev !== 0 ? (
                  <p
                    className={`text-[11px] ${
                      up ? 'text-[#16A34A]' : down ? 'text-[#DC2626]' : 'text-[#737373]'
                    }`}
                  >
                    {up ? '▲' : '▼'} {Math.abs(m.change_vs_prev)}%
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─── Critical panel ─── */

function CriticalPanel({
  items,
  loading,
}: {
  items: CriticalEmployee[];
  loading: boolean;
}) {
  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
        <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
        Kritik Risk
      </h2>
      <p className="text-xs text-[#737373]">BAT skorları, son dönem</p>
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <p className="mt-4 text-xs text-[#16A34A]">
          Şu an kritik risk listesinde kimse yok ✓
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 5).map((it) => (
            <li
              key={it.employee_id}
              className="flex items-center justify-between rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[#7F1D1D]">
                  {it.ad} {it.soyad}
                </p>
                {it.department_name ? <p className="text-[#991B1B]">{it.department_name}</p> : null}
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-[#7F1D1D]">
                {it.score.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── Top actions ─── */

function TopActionsPanel({
  actions,
  loading,
}: {
  actions: RankedAction[];
  loading: boolean;
}) {
  return (
    <section className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <h2 className="text-sm font-semibold text-[#0A0A0A]">Önerilen Aksiyonlar</h2>
      <p className="text-xs text-[#737373]">Rolünüze özel TOP 5 öncelik — Action Center</p>
      {loading ? (
        <Loading />
      ) : actions.length === 0 ? (
        <Empty hint="Şu anda öncelik listesinde yok" icon={<Sparkles className="h-6 w-6 text-[#A3A3A3]" />} />
      ) : (
        <ul className="mt-4 space-y-2">
          {actions.slice(0, 5).map((a) => (
            <li key={a.action_id} className="rounded-lg border border-[#EDEDED] p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-medium text-[#5E5CE6]">
                  Öncelik {Math.round(a.priority_score * 100)}
                </span>
                <span className="text-[11px] text-[#737373]">{a.type}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">{a.title_tr}</p>
              <p className="mt-1 text-[11px] text-[#525252]">{a.rationale_tr}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 text-right">
        <Link href="/aksiyonlar/canli" className="text-xs font-medium text-[#5E5CE6] hover:underline">
          Tümünü gör →
        </Link>
      </div>
    </section>
  );
}

/* ─── shared ─── */

function Loading() {
  return (
    <div className="mt-4 flex items-center gap-2 text-xs text-[#737373]">
      <Loader2 className="h-3 w-3 animate-spin" /> Yükleniyor…
    </div>
  );
}

function Empty({ hint, icon }: { hint: string; icon: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-6 text-center">
      {icon}
      <p className="mt-2 text-xs text-[#737373]">{hint}</p>
    </div>
  );
}
