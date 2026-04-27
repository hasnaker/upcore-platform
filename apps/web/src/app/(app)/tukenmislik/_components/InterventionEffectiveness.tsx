'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Download,
  FileText,
  Target,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABEL,
  useEffectivenessDetail,
  useEffectivenessTrend,
  useInterventionEffectiveness,
  type EffectCategory,
  type EffectivenessOutcomeEntry,
  type EffectivenessSummaryItem,
  type EffectivenessTrendPoint,
  type EffectivenessTrendSeries,
} from '@/hooks/useInterventions';

// ═══════════════════════════════════════════════════════════════════════════
// Effect-size classification (Cohen 1988 thresholds).
// ═══════════════════════════════════════════════════════════════════════════

const EFFECT_BADGE: Record<EffectCategory, { label: string; bg: string; fg: string; ring: string }> = {
  trivial: {
    label: 'Önemsiz',
    bg: 'bg-bg-3',
    fg: 'text-ink-60',
    ring: 'ring-line',
  },
  small: {
    label: 'Küçük',
    bg: 'bg-accent-soft',
    fg: 'text-accent',
    ring: 'ring-accent/30',
  },
  medium: {
    label: 'Orta',
    bg: 'bg-amber-soft',
    fg: 'text-amber',
    ring: 'ring-amber/30',
  },
  large: {
    label: 'Büyük',
    bg: 'bg-green-soft',
    fg: 'text-green',
    ring: 'ring-green/30',
  },
  insufficient: {
    label: 'Yetersiz veri',
    bg: 'bg-bg-3',
    fg: 'text-ink-40',
    ring: 'ring-line',
  },
};

function formatD(item: EffectivenessSummaryItem): string {
  if (item.insufficient || item.cohens_d == null) {
    return '—';
  }
  const d = item.cohens_d.toFixed(2);
  if (item.ci_low != null && item.ci_high != null) {
    return `d=${d} [${item.ci_low.toFixed(2)}, ${item.ci_high.toFixed(2)}]`;
  }
  return `d=${d}`;
}

function formatP(p: number | null | undefined): string {
  if (p == null) return '—';
  if (p < 0.001) return 'p<0.001';
  if (p < 0.01) return `p=${p.toFixed(3)}`;
  return `p=${p.toFixed(2)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════

export const InterventionEffectiveness = () => {
  const summary = useInterventionEffectiveness();
  const trend = useEffectivenessTrend(8);
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportCsv = () => {
    const items = summary.data?.items ?? [];
    if (items.length === 0) return;
    setExporting(true);
    try {
      const csv = buildSummaryCsv(items);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.download = `mudahale-etkinlik-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section
      data-testid="intervention-effectiveness"
      className="rounded-xl border border-line bg-bg"
    >
      <header className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Müdahale Etkinlik Panosu
          </h2>
          <p className="mt-0.5 text-xs text-ink-40">
            Cohen&apos;s d · %95 güven aralığı · paired t-test · min N={10}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={
              exporting ||
              summary.isLoading ||
              (summary.data?.items ?? []).length === 0
            }
            data-testid="effectiveness-export-csv"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink hover:border-accent/50 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV indir
          </button>
        </div>
      </header>

      {/* Summary state */}
      {summary.isLoading && <SummarySkeleton />}

      {summary.isError && (
        <ErrorBanner
          message={
            summary.error?.message ??
            'Etkinlik verisi yüklenemedi. Lütfen tekrar deneyin.'
          }
          onRetry={() => summary.refetch()}
        />
      )}

      {summary.isSuccess && summary.data.items.length === 0 && <EmptyState />}

      {summary.isSuccess && summary.data.items.length > 0 && (
        <>
          <div
            data-testid="effectiveness-table"
            className="overflow-x-auto"
          >
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Müdahale</th>
                  <th className="px-4 py-2 text-left font-semibold">Kategori</th>
                  <th className="px-4 py-2 text-right font-semibold">N</th>
                  <th className="px-4 py-2 text-left font-semibold">Cohen&apos;s d [%95 GA]</th>
                  <th className="px-4 py-2 text-left font-semibold">p değeri</th>
                  <th className="px-4 py-2 text-left font-semibold">Etki</th>
                  <th className="px-4 py-2 text-right font-semibold">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.data.items.map((item) => {
                  const badge = EFFECT_BADGE[item.effect_category] ?? EFFECT_BADGE.insufficient;
                  return (
                    <tr
                      key={item.intervention_id}
                      data-testid={`effectiveness-row-${item.code}`}
                      className="hover:bg-bg-2"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{item.title_tr}</p>
                        <p className="text-[11px] text-ink-40">
                          {item.code} · Kanıt: {item.evidence_tier}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink-60">
                        {CATEGORY_LABEL[item.category] ?? item.category}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">
                        {item.n_total}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink">
                        {formatD(item)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink-60">
                        {formatP(item.p_value)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${badge.bg} ${badge.fg} ${badge.ring}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setOpenDetailId(item.intervention_id)}
                          data-testid={`effectiveness-open-detail-${item.code}`}
                          className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-2.5 py-1 text-[11px] font-medium text-accent hover:border-accent/50 hover:bg-accent-soft"
                        >
                          <FileText className="h-3 w-3" />
                          İncele
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TrendPanel
            isLoading={trend.isLoading}
            isError={trend.isError}
            errorMessage={trend.error?.message}
            series={trend.data?.series ?? []}
            weeks={trend.data?.weeks ?? 8}
            onRetry={() => trend.refetch()}
          />
        </>
      )}

      {openDetailId && (
        <DetailDrawer
          catalogId={openDetailId}
          onClose={() => setOpenDetailId(null)}
        />
      )}
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// States
// ═══════════════════════════════════════════════════════════════════════════

const SummarySkeleton = () => (
  <div data-testid="effectiveness-loading" className="space-y-2 p-4">
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i} className="h-12 animate-pulse rounded bg-bg-3" />
    ))}
  </div>
);

const ErrorBanner = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div
    data-testid="effectiveness-error"
    className="m-4 rounded-md border border-red/30 bg-red-soft p-4 text-sm text-red"
  >
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Etkinlik verisi yüklenemedi</p>
        <p className="mt-1 text-[12px]">{message}</p>
      </div>
    </div>
    <button
      type="button"
      onClick={onRetry}
      data-testid="effectiveness-retry"
      className="mt-3 rounded bg-red px-3 py-1.5 text-[12px] font-medium text-white"
    >
      Yeniden dene
    </button>
  </div>
);

const EmptyState = () => (
  <div
    data-testid="effectiveness-empty"
    className="flex flex-col items-center gap-3 px-6 py-12 text-center"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
      <BarChart3 className="h-5 w-5 text-accent" />
    </div>
    <p className="text-sm font-medium text-ink">
      Henüz yeterli müdahale sonucu yok
    </p>
    <p className="max-w-md text-xs text-ink-40">
      Cohen&apos;s d hesaplamak için en az {10} çalışanın müdahaleyi tamamlayıp
      pre/post BAT-12 ölçümü yapmış olması gerekir. Worker her saat
      otomatik olarak yeni tamamlanan atamaları işleyip bu panoyu günceller.
    </p>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Trend line chart (8-week rolling Cohen's d with CI band)
// ═══════════════════════════════════════════════════════════════════════════

const SERIES_COLORS = [
  '#5E5CE6', // accent
  '#059669', // green
  '#D97706', // amber
  '#DC2626', // red
  '#0891B2',
  '#9333EA',
  '#EA580C',
  '#475569',
];

const TrendPanel = ({
  isLoading,
  isError,
  errorMessage,
  series,
  weeks,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  series: EffectivenessTrendSeries[];
  weeks: number;
  onRetry: () => void;
}) => {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const { chartData, xLabels } = useMemo(() => {
    return buildChartDataset(series, weeks);
  }, [series, weeks]);

  const visibleSeries = useMemo(
    () => series.filter((s) => !hidden[s.intervention_id]),
    [series, hidden],
  );

  return (
    <div className="border-t border-line p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Haftalık Cohen&apos;s d (son {weeks} hafta)
        </h3>
      </div>

      {isLoading && (
        <div className="h-48 animate-pulse rounded bg-bg-3" />
      )}

      {isError && (
        <ErrorBanner
          message={errorMessage ?? 'Trend yüklenemedi'}
          onRetry={onRetry}
        />
      )}

      {!isLoading && !isError && series.length === 0 && (
        <p className="rounded border border-dashed border-line bg-bg-2 p-6 text-center text-[12px] text-ink-40">
          Henüz hiçbir müdahale için trend grafiği oluşturulacak kadar veri yok.
        </p>
      )}

      {!isLoading && !isError && series.length > 0 && (
        <>
          <TrendChart
            series={visibleSeries}
            chartData={chartData}
            xLabels={xLabels}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {series.map((s, i) => {
              const color = SERIES_COLORS[i % SERIES_COLORS.length];
              const isHidden = hidden[s.intervention_id];
              return (
                <button
                  key={s.intervention_id}
                  type="button"
                  onClick={() =>
                    setHidden((prev) => ({
                      ...prev,
                      [s.intervention_id]: !prev[s.intervention_id],
                    }))
                  }
                  data-testid={`effectiveness-trend-toggle-${s.code}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-opacity ${
                    isHidden
                      ? 'border-line bg-bg opacity-40'
                      : 'border-line bg-bg'
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {s.title_tr}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

interface ChartPointAug extends EffectivenessTrendPoint {
  seriesColor: string;
  seriesId: string;
}

function buildChartDataset(
  series: EffectivenessTrendSeries[],
  weeks: number,
): { chartData: Map<string, ChartPointAug[]>; xLabels: string[] } {
  const map = new Map<string, ChartPointAug[]>();
  const weekSet = new Set<string>();
  series.forEach((s, i) => {
    const color = SERIES_COLORS[i % SERIES_COLORS.length] ?? '#5E5CE6';
    const augmented: ChartPointAug[] = s.points.map((p) => ({
      ...p,
      seriesColor: color,
      seriesId: s.intervention_id,
    }));
    map.set(s.intervention_id, augmented);
    s.points.forEach((p) => weekSet.add(p.week_start));
  });
  const xLabels = Array.from(weekSet).sort().slice(-weeks);
  return { chartData: map, xLabels };
}

const TrendChart = ({
  series,
  chartData,
  xLabels,
}: {
  series: EffectivenessTrendSeries[];
  chartData: Map<string, ChartPointAug[]>;
  xLabels: string[];
}) => {
  const width = 640;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 30;
  const innerW = width - paddingLeft - paddingRight;
  const innerH = height - paddingTop - paddingBottom;

  const yMin = -0.2;
  const yMax = 1.2;

  const xScale = (i: number) =>
    xLabels.length <= 1
      ? paddingLeft + innerW / 2
      : paddingLeft + (innerW * i) / (xLabels.length - 1);
  const yScale = (d: number) =>
    paddingTop + innerH * (1 - (d - yMin) / (yMax - yMin));

  const gridYs = [0, 0.2, 0.5, 0.8, 1.0];

  return (
    <div className="overflow-x-auto" data-testid="effectiveness-trend-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full text-ink-40"
        role="img"
        aria-label="Haftalık Cohen's d trend grafiği"
      >
        {/* Grid lines */}
        {gridYs.map((g) => (
          <g key={g}>
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={yScale(g)}
              y2={yScale(g)}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeDasharray="2 2"
            />
            <text
              x={paddingLeft - 6}
              y={yScale(g) + 3}
              fontSize="10"
              textAnchor="end"
              fill="currentColor"
            >
              {g.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map((label, i) => (
          <text
            key={label}
            x={xScale(i)}
            y={height - paddingBottom + 14}
            fontSize="9"
            textAnchor="middle"
            fill="currentColor"
          >
            {new Date(label).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
            })}
          </text>
        ))}

        {/* Series */}
        {series.map((s) => {
          const pts = chartData.get(s.intervention_id) ?? [];
          const color = pts[0]?.seriesColor ?? '#5E5CE6';
          const pointsByWeek = new Map(pts.map((p) => [p.week_start, p]));
          const line: Array<{ x: number; y: number; p: ChartPointAug }> = [];
          const band: Array<{ x: number; yLow: number; yHigh: number }> = [];
          xLabels.forEach((w, i) => {
            const p = pointsByWeek.get(w);
            if (p && p.cohens_d != null) {
              line.push({ x: xScale(i), y: yScale(p.cohens_d), p });
              if (p.ci_low != null && p.ci_high != null) {
                band.push({
                  x: xScale(i),
                  yLow: yScale(Math.max(yMin, p.ci_low)),
                  yHigh: yScale(Math.min(yMax, p.ci_high)),
                });
              }
            }
          });
          if (line.length === 0) return null;

          // Shaded CI band polygon (upper path forward, lower path reversed).
          const first = band[0];
          const bandPath = band.length > 1 && first
            ? `M ${first.x} ${first.yHigh} ` +
              band.slice(1).map((b) => `L ${b.x} ${b.yHigh}`).join(' ') +
              ' ' +
              band
                .slice()
                .reverse()
                .map((b) => `L ${b.x} ${b.yLow}`)
                .join(' ') +
              ' Z'
            : '';

          const linePath = line
            .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
            .join(' ');

          return (
            <g key={s.intervention_id}>
              {bandPath && (
                <path d={bandPath} fill={color} fillOpacity={0.08} />
              )}
              <path
                d={linePath}
                stroke={color}
                strokeWidth={1.5}
                fill="none"
              />
              {line.map((pt) => (
                <circle
                  key={`${s.intervention_id}-${pt.p.week_start}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={3}
                  fill={color}
                >
                  <title>
                    {`${s.title_tr} · ${new Date(pt.p.week_start).toLocaleDateString('tr-TR')}\nd=${pt.p.cohens_d?.toFixed(2) ?? '—'} [${pt.p.ci_low?.toFixed(2) ?? '—'}, ${pt.p.ci_high?.toFixed(2) ?? '—'}]\nN=${pt.p.n}`}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Detail drawer
// ═══════════════════════════════════════════════════════════════════════════

const DetailDrawer = ({
  catalogId,
  onClose,
}: {
  catalogId: string;
  onClose: () => void;
}) => {
  const detail = useEffectivenessDetail(catalogId, 8);

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="effectiveness-detail-drawer"
      className="fixed inset-0 z-50 flex"
    >
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside className="flex w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-bg">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-ink-40">
              Müdahale detayı
            </p>
            <h3 className="text-base font-semibold text-ink">
              {detail.data?.summary.title_tr ?? 'Yükleniyor…'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-full p-1 text-ink-40 hover:bg-bg-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {detail.isLoading && (
          <div className="space-y-2 p-4" data-testid="effectiveness-detail-loading">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-bg-3" />
            ))}
          </div>
        )}

        {detail.isError && (
          <ErrorBanner
            message={detail.error?.message ?? 'Detay yüklenemedi'}
            onRetry={() => detail.refetch()}
          />
        )}

        {detail.isSuccess && (
          <div className="flex flex-col gap-6 p-5">
            <DetailSummary item={detail.data.summary} />
            <DetailTrend
              points={detail.data.trend}
              title={detail.data.summary.title_tr}
            />
            <DetailEntries entries={detail.data.entries} />
          </div>
        )}
      </aside>
    </div>
  );
};

const DetailSummary = ({ item }: { item: EffectivenessSummaryItem }) => {
  const badge = EFFECT_BADGE[item.effect_category] ?? EFFECT_BADGE.insufficient;
  return (
    <div className="rounded-lg border border-line bg-bg-2 p-4">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-accent" />
        <span className="text-[11px] uppercase tracking-widest text-ink-40">
          Etki büyüklüğü
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-ink">
        {formatD(item)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-60">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${badge.bg} ${badge.fg} ${badge.ring}`}
        >
          {badge.label}
        </span>
        <span>N = {item.n_total}</span>
        <span>{formatP(item.p_value)}</span>
        {item.avg_bat_drop != null && (
          <span>
            Ort. BAT değişimi:{' '}
            <span className="tabular-nums">
              {item.avg_bat_drop.toFixed(2)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
};

const DetailTrend = ({
  points,
  title,
}: {
  points: EffectivenessTrendPoint[];
  title: string;
}) => {
  const series = useMemo<EffectivenessTrendSeries[]>(
    () => [
      {
        intervention_id: 'detail',
        code: 'detail',
        title_tr: title,
        points,
      },
    ],
    [points, title],
  );
  const { chartData, xLabels } = useMemo(
    () => buildChartDataset(series, Math.max(points.length, 1)),
    [series, points.length],
  );
  return (
    <div>
      <h4 className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
        8 haftalık trend
      </h4>
      {points.every((p) => p.cohens_d == null) ? (
        <p className="rounded border border-dashed border-line bg-bg-2 p-4 text-[12px] text-ink-40">
          Haftalık pencerelerin hiçbiri minimum örneklem sayısına
          (N={10}) ulaşmadı.
        </p>
      ) : (
        <TrendChart series={series} chartData={chartData} xLabels={xLabels} />
      )}
    </div>
  );
};

const DetailEntries = ({
  entries,
}: {
  entries: EffectivenessOutcomeEntry[];
}) => (
  <div>
    <h4 className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
      Çalışan ölçümleri ({entries.length})
    </h4>
    {entries.length === 0 ? (
      <p className="rounded border border-dashed border-line bg-bg-2 p-4 text-[12px] text-ink-40">
        Bu müdahale için henüz pre/post eşli ölçüm kaydedilmemiş.
      </p>
    ) : (
      <div className="rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">#</th>
              <th className="px-3 py-2 text-right font-semibold">Öncesi</th>
              <th className="px-3 py-2 text-right font-semibold">Sonrası</th>
              <th className="px-3 py-2 text-right font-semibold">Δ</th>
              <th className="px-3 py-2 text-right font-semibold">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((e, i) => (
              <tr key={e.assignment_id}>
                <td className="px-3 py-2 text-ink-40">{i + 1}</td>
                <td className="px-3 py-2 text-right tabular-nums text-red">
                  {e.pre_bat_score.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-green">
                  {e.post_bat_score.toFixed(2)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-semibold ${
                    e.delta < 0 ? 'text-green' : 'text-red'
                  }`}
                >
                  {e.delta.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-40">
                  {new Date(e.measured_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// CSV export (client-side)
// ═══════════════════════════════════════════════════════════════════════════

const CSV_COLUMNS = [
  'code',
  'title_tr',
  'category',
  'evidence_tier',
  'n_total',
  'n_completed',
  'cohens_d',
  'ci_low',
  'ci_high',
  'p_value',
  'mean_pre',
  'mean_post',
  'avg_bat_drop',
  'effect_category',
  'insufficient',
] as const;

function csvCell(value: unknown): string {
  if (value == null) return '';
  const str = typeof value === 'number' ? value.toString() : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildSummaryCsv(items: EffectivenessSummaryItem[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = items.map((it) =>
    CSV_COLUMNS.map((col) => {
      const v = (it as unknown as Record<string, unknown>)[col];
      return csvCell(v);
    }).join(','),
  );
  return [header, ...rows].join('\n');
}
