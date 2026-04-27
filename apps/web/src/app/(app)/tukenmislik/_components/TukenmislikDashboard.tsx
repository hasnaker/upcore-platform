'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Flame,
  Info,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  useBurnoutHeatmap,
  useCriticalEmployees,
  type BurnoutBand,
  type HeatmapCell,
  type HeatmapStats,
  type CriticalEmployee,
} from '@/hooks/useBurnout';
import { AssignInterventionModal } from './AssignInterventionModal';
import { InterventionEffectiveness } from './InterventionEffectiveness';
import { InterventionFlow } from './InterventionFlow';

const WEEK_OPTIONS = [4, 8, 12, 26];

export function TukenmislikDashboard() {
  const [weeks, setWeeks] = useState<number>(4);
  const heatmap = useBurnoutHeatmap(weeks);
  const critical = useCriticalEmployees(10);

  return (
    <div className="flex flex-col gap-8">
      {/* Week selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border border-line bg-bg p-1 text-[12px]">
          {WEEK_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeeks(w)}
              className={`rounded px-3 py-1.5 font-medium transition-colors ${
                weeks === w
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-60 hover:text-ink'
              }`}
            >
              {w} hafta
            </button>
          ))}
        </div>
        <p className="text-[11px] text-ink-40">
          Kaynak: BAT-12-TR · Eşikler: yeşil ≤2.58, amber ≤3.01, kırmızı &gt;3.01 (Koçak 2022)
        </p>
      </div>

      {/* Stats + heatmap + sidebar grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <HeatmapPanel
          isLoading={heatmap.isLoading}
          isError={heatmap.isError}
          errorMessage={heatmap.error?.message}
          cells={heatmap.data?.cells ?? []}
          weeks={weeks}
          onRetry={heatmap.refetch}
        />
        <SummaryPanel
          isLoading={heatmap.isLoading}
          stats={heatmap.data?.stats}
        />
      </div>

      {/* Critical employees */}
      <CriticalPanel
        isLoading={critical.isLoading}
        isError={critical.isError}
        errorMessage={critical.error?.message}
        items={critical.data?.items ?? []}
        onRetry={critical.refetch}
      />

      {/* Active interventions — consent status + reminder */}
      <InterventionFlow />

      {/* Intervention effectiveness */}
      <InterventionEffectiveness />

      {/* Transparency note */}
      <div className="flex items-start gap-3 rounded-lg border border-line bg-bg-2 p-4 text-[12px] text-ink-60">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div>
          <p className="font-medium text-ink-80">Veri bilimi notları</p>
          <p className="mt-1 leading-relaxed">
            Skorlar BAT-12-TR (Koçak, Gençay &amp; Schaufeli 2022) ve JD-R modeline dayanır.
            Bireysel sonuçlar şeffaflıktır, damgalama amaçlı değildir. Min N=5 altında
            departman ortalaması gösterilmez.
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Heatmap Panel
// ═══════════════════════════════════════════════════════════════════════════

const BAND_CELL: Record<BurnoutBand, string> = {
  green: 'bg-green-soft text-green',
  amber: 'bg-amber-soft text-amber',
  red: 'bg-red-soft text-red',
  na: 'bg-bg-3 text-ink-40',
};

const BAND_LABEL: Record<BurnoutBand, string> = {
  green: 'İyi',
  amber: 'Uyarı',
  red: 'Kritik',
  na: 'Veri yok',
};

const HeatmapPanel = ({
  isLoading,
  isError,
  errorMessage,
  cells,
  weeks,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  cells: HeatmapCell[];
  weeks: number;
  onRetry: () => void;
}) => {
  // Pivot: departments (rows) × week_start (columns)
  const { departments, weekKeys, matrix } = useMemo(() => {
    const deptMap = new Map<string, { id: string | null; name: string }>();
    const weekSet = new Set<string>();
    for (const c of cells) {
      const key = c.department_id ?? `__na_${c.department_name}`;
      if (!deptMap.has(key)) deptMap.set(key, { id: c.department_id, name: c.department_name });
      weekSet.add(c.week_start);
    }
    const departments = Array.from(deptMap.entries()).map(([key, d]) => ({
      key,
      id: d.id,
      name: d.name,
    }));
    const weekKeys = Array.from(weekSet).sort();

    const matrix = new Map<string, HeatmapCell>();
    for (const c of cells) {
      const key = `${c.department_id ?? `__na_${c.department_name}`}__${c.week_start}`;
      matrix.set(key, c);
    }
    return { departments, weekKeys, matrix };
  }, [cells]);

  return (
    <section className="rounded-xl border border-line bg-bg p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Departman × Hafta Isı Haritası
        </h2>
        <span className="text-[11px] text-ink-40">
          {weeks} haftalık pencere
        </span>
      </div>

      {isLoading && (
        <div className="grid gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-bg-3" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-red/30 bg-red-soft p-4 text-sm text-red">
          <p className="font-medium">Heatmap yüklenemedi</p>
          <p className="mt-1 text-[12px]">{errorMessage ?? 'Bilinmeyen hata'}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded bg-red px-3 py-1.5 text-[12px] font-medium text-white"
          >
            Yeniden dene
          </button>
        </div>
      )}

      {!isLoading && !isError && departments.length === 0 && (
        <EmptyHeatmap />
      )}

      {!isLoading && !isError && departments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-ink-40">
                <th className="px-2 py-2 text-left font-semibold">Departman</th>
                {weekKeys.map((w) => (
                  <th key={w} className="px-2 py-2 text-center font-semibold">
                    {new Date(w).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.key}>
                  <td className="px-2 py-1.5 text-[12px] font-medium text-ink-80">{d.name}</td>
                  {weekKeys.map((w) => {
                    const cell = matrix.get(`${d.key}__${w}`);
                    return (
                      <td key={w} className="px-1 py-1 text-center">
                        <div
                          className={`group relative mx-auto flex h-9 w-14 items-center justify-center rounded-md text-[12px] font-semibold tabular-nums ${
                            cell ? BAND_CELL[cell.band] : 'bg-bg-3 text-ink-40'
                          }`}
                          title={
                            cell
                              ? `${cell.department_name} · ${w}\nSkor: ${cell.avg_score?.toFixed(2) ?? '—'}\nKatılımcı: ${cell.respondent_count}`
                              : 'Veri yok'
                          }
                        >
                          {cell?.avg_score != null ? cell.avg_score.toFixed(2) : '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-ink-60">
        {(['green', 'amber', 'red', 'na'] as BurnoutBand[]).map((band) => (
          <div key={band} className="flex items-center gap-1.5">
            <span className={`h-3 w-5 rounded ${BAND_CELL[band].split(' ')[0]}`} />
            <span>{BAND_LABEL[band]}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Summary sidebar
// ═══════════════════════════════════════════════════════════════════════════

const SummaryPanel = ({
  isLoading,
  stats,
}: {
  isLoading: boolean;
  stats?: HeatmapStats;
}) => {
  if (isLoading) {
    return (
      <aside className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-line bg-bg" />
        ))}
      </aside>
    );
  }

  const total = stats?.total_employees ?? 0;
  const redPct = total > 0 ? Math.round(((stats?.red_count ?? 0) / total) * 100) : 0;

  return (
    <aside className="flex flex-col gap-3">
      <StatBlock
        label="Ölçüm yapılan çalışan"
        value={total}
        icon={<Users className="h-4 w-4" />}
      />
      <StatBlock
        label="Ortalama BAT-12"
        value={stats?.avg_total != null ? stats.avg_total.toFixed(2) : '—'}
        icon={<Flame className="h-4 w-4" />}
        tone={
          stats?.avg_total == null
            ? 'gray'
            : stats.avg_total > 3.01
              ? 'red'
              : stats.avg_total > 2.58
                ? 'amber'
                : 'green'
        }
      />
      <StatBlock
        label="Kırmızı bölgedeki çalışan"
        value={`${stats?.red_count ?? 0} (%${redPct})`}
        icon={<AlertTriangle className="h-4 w-4" />}
        tone={redPct > 15 ? 'red' : redPct > 5 ? 'amber' : 'green'}
      />
      <StatBlock
        label="Sarı bölge"
        value={stats?.amber_count ?? 0}
        icon={<TrendingUp className="h-4 w-4" />}
        tone="amber"
      />
      <StatBlock
        label="Yeşil bölge"
        value={stats?.green_count ?? 0}
        icon={<TrendingDown className="h-4 w-4" />}
        tone="green"
      />
    </aside>
  );
};

const StatBlock = ({
  label,
  value,
  icon,
  tone = 'gray',
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: 'green' | 'amber' | 'red' | 'gray';
}) => {
  const toneColor = {
    green: 'text-green',
    amber: 'text-amber',
    red: 'text-red',
    gray: 'text-ink',
  }[tone];
  return (
    <div className="rounded-lg border border-line bg-bg p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-40">
        {icon}
        {label}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneColor}`}>{value}</p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Critical employees table
// ═══════════════════════════════════════════════════════════════════════════

const CriticalPanel = ({
  isLoading,
  isError,
  errorMessage,
  items,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  items: CriticalEmployee[];
  onRetry: () => void;
}) => {
  const [assignTarget, setAssignTarget] = useState<CriticalEmployee | null>(null);

  return (
    <section className="rounded-xl border border-line bg-bg">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Kritik Çalışanlar
        </h2>
        <span className="text-[11px] text-ink-40">
          Amber + kırmızı band · skor azalan sırada
        </span>
      </header>

      {isLoading && (
        <div className="space-y-1 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-bg-3" />
          ))}
        </div>
      )}

      {isError && (
        <div className="m-4 rounded-md border border-red/30 bg-red-soft p-4 text-sm text-red">
          <p className="font-medium">Kritik çalışan listesi yüklenemedi</p>
          <p className="mt-1 text-[12px]">{errorMessage}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded bg-red px-3 py-1.5 text-[12px] font-medium text-white"
          >
            Yeniden dene
          </button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-soft">
            <Flame className="h-5 w-5 text-green" />
          </div>
          <p className="mt-3 text-sm font-medium text-ink">
            Şu anda kritik bölgede çalışan yok
          </p>
          <p className="mt-1 text-xs text-ink-40">
            Tüm BAT-12 skorları yeşil band'de (≤2.58) — harika! Yeni BAT pulse anketi
            sonuçları geldikçe değişebilir.
          </p>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">#</th>
                <th className="px-4 py-2 text-left font-semibold">Çalışan</th>
                <th className="px-4 py-2 text-left font-semibold">Departman</th>
                <th className="px-4 py-2 text-left font-semibold">BAT-12</th>
                <th className="px-4 py-2 text-left font-semibold">Band</th>
                <th className="px-4 py-2 text-left font-semibold">Son ölçüm</th>
                <th className="px-4 py-2 text-right font-semibold">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((emp, i) => (
                <tr key={emp.employee_id} className="hover:bg-bg-2">
                  <td className="px-4 py-3 tabular-nums text-ink-40">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/calisanlar/${emp.employee_id}`}
                      className="text-sm font-medium text-ink hover:text-accent"
                    >
                      {emp.ad} {emp.soyad}
                    </Link>
                    {emp.employee_no && (
                      <p className="text-[11px] text-ink-40">Sicil: {emp.employee_no}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-60">
                    {emp.department_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-ink">
                    {emp.score.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-medium ${BAND_CELL[emp.band]}`}
                    >
                      {BAND_LABEL[emp.band]}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-40">
                    {new Date(emp.last_measured_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAssignTarget(emp)}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:border-accent/50 hover:bg-accent-soft"
                      >
                        <BookOpen className="h-3 w-3" />
                        Koçluk öner
                      </button>
                      <Link
                        href={`/calisanlar/${emp.employee_id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-60 hover:text-accent"
                      >
                        İncele →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {assignTarget && (
        <AssignInterventionModal
          employeeId={assignTarget.employee_id}
          employeeName={`${assignTarget.ad} ${assignTarget.soyad}`}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════

const EmptyHeatmap = () => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-bg-2 px-6 py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
      <Calendar className="h-6 w-6 text-accent" />
    </div>
    <p className="text-sm font-medium text-ink">Henüz BAT-12 ölçümü yapılmadı</p>
    <p className="max-w-md text-xs text-ink-40">
      Heatmap için en az bir BAT-12-TR pulse anketinin yanıtlanması gerekir.
      Pulse anketi başlatmak için Anketler modülüne gidin.
    </p>
    <Link
      href="/anketler"
      className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline"
    >
      Pulse anketi başlat →
    </Link>
  </div>
);
