'use client';

import Link from 'next/link';
import { AlertTriangle, Flame, Info, TrendingDown, TrendingUp } from 'lucide-react';
import {
  useEmployeeBurnout,
  type BurnoutBand,
  type JDRDimension,
  type SubscaleScore,
  type TrendPoint,
} from '@/hooks/useBurnout';

const BAND_TEXT: Record<BurnoutBand, string> = {
  green: 'text-green',
  amber: 'text-amber',
  red: 'text-red',
  na: 'text-ink-40',
};

const BAND_BG: Record<BurnoutBand, string> = {
  green: 'bg-green-soft',
  amber: 'bg-amber-soft',
  red: 'bg-red-soft',
  na: 'bg-bg-3',
};

const BAND_LABEL: Record<BurnoutBand, string> = {
  green: 'Düşük risk',
  amber: 'Orta risk',
  red: 'Yüksek risk',
  na: 'Veri yok',
};

export function EmployeeBurnoutTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError, error, refetch } = useEmployeeBurnout(employeeId);

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="h-64 animate-pulse rounded-lg border border-line bg-bg" />
        <div className="h-64 animate-pulse rounded-lg border border-line bg-bg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red/30 bg-red-soft p-4 text-sm text-red">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Tükenmişlik verisi alınamadı</p>
          <p className="mt-1 text-[12px]">{error?.message ?? 'Bilinmeyen hata'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded bg-red px-3 py-1.5 text-[12px] font-medium text-white"
          >
            Yeniden dene
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.has_data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-bg-2 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
          <Flame className="h-6 w-6 text-accent" />
        </div>
        <p className="text-sm font-medium text-ink">Henüz BAT-12-TR ölçümü yok</p>
        <p className="max-w-md text-xs text-ink-40">
          Bu çalışana bir pulse anketi gönderildiğinde ve yanıt geldiğinde burada
          4 alt boyut skoru, JD-R dengesi ve 30 günlük trend görünecek.
        </p>
        <Link
          href="/anketler"
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline"
        >
          Pulse anketi başlat →
        </Link>
      </div>
    );
  }

  const totalBand = data.bat_band;
  const totalText = data.bat_total != null ? data.bat_total.toFixed(2) : '—';

  return (
    <div className="flex flex-col gap-6">
      {/* Genel özet */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="BAT-12-TR Toplam"
          value={totalText}
          sub={BAND_LABEL[totalBand]}
          tone={totalBand}
          icon={<Flame className="h-4 w-4" />}
        />
        <SummaryCard
          label="Avrupa normu"
          value={data.norm_percentile != null ? `%${data.norm_percentile}` : '—'}
          sub="Yüzdelik sıralama"
          tone={
            data.norm_percentile == null
              ? 'na'
              : data.norm_percentile >= 80
                ? 'red'
                : data.norm_percentile >= 60
                  ? 'amber'
                  : 'green'
          }
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <SummaryCard
          label="Son ölçüm"
          value={
            data.last_measured_at
              ? new Date(data.last_measured_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'
          }
          sub="Pulse anketi tarihi"
          tone="na"
          icon={<TrendingDown className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* BAT-12 4 alt boyut */}
        <SubscalePanel subscales={data.subscales} />
        {/* JD-R dengesi */}
        {data.jdr && <JDRPanel jdr={data.jdr} />}
      </div>

      {/* 30-90 gün trend */}
      <TrendPanel trend={data.trend} />

      {/* Transparency note */}
      <div className="flex items-start gap-3 rounded-lg border border-line bg-bg-2 p-4 text-[12px] text-ink-60">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div>
          <p className="font-medium text-ink-80">BAT-12-TR Yorumu</p>
          <p className="mt-1 leading-relaxed">
            Eşikler: yeşil ≤2.58, amber ≤3.01, kırmızı &gt;3.01 (Koçak, Gençay &amp;
            Schaufeli 2022). Sonuçlar klinik tanı değildir — müdahale kararı için
            yöneticisi ile 1:1 görüşme önerilir.
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

const SummaryCard = ({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: BurnoutBand;
  icon?: React.ReactNode;
}) => (
  <div className="rounded-lg border border-line bg-bg p-4">
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-40">
      {icon}
      {label}
    </div>
    <p className={`mt-2 text-2xl font-semibold tabular-nums ${BAND_TEXT[tone]}`}>
      {value}
    </p>
    <p className="mt-0.5 text-[11px] text-ink-40">{sub}</p>
  </div>
);

const SubscalePanel = ({ subscales }: { subscales: SubscaleScore[] }) => (
  <div className="rounded-lg border border-line bg-bg p-5">
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-40">
      BAT-12-TR Alt Boyutları
    </p>
    <div className="flex flex-col gap-3">
      {subscales.map((s) => {
        const pct = s.score != null ? Math.min(100, (s.score / 5) * 100) : 0;
        return (
          <div key={s.key}>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-ink-60">{s.label_tr}</span>
              <span className={`font-semibold tabular-nums ${BAND_TEXT[s.band]}`}>
                {s.score != null ? s.score.toFixed(2) : '—'}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-bg-3">
              {s.score != null && (
                <div
                  className={`h-full rounded-full ${
                    s.band === 'red'
                      ? 'bg-red'
                      : s.band === 'amber'
                        ? 'bg-amber'
                        : 'bg-green'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const JDRPanel = ({
  jdr,
}: {
  jdr: {
    demands: JDRDimension[];
    resources: JDRDimension[];
    demand_avg: number | null;
    resource_avg: number | null;
    balance_gap: number | null;
  };
}) => {
  const gapTone =
    jdr.balance_gap == null
      ? 'na'
      : jdr.balance_gap >= 15
        ? 'red'
        : jdr.balance_gap >= 0
          ? 'amber'
          : 'green';

  return (
    <div className="rounded-lg border border-line bg-bg p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-40">
          JD-R Dengesi
        </p>
        {jdr.balance_gap != null && (
          <span
            className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-medium ${BAND_BG[gapTone as BurnoutBand]} ${BAND_TEXT[gapTone as BurnoutBand]}`}
          >
            Gap: {jdr.balance_gap > 0 ? '+' : ''}
            {jdr.balance_gap}
          </span>
        )}
      </div>

      {/* Ortalamalar */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <BalanceBar
          label="Talepler"
          value={jdr.demand_avg}
          color="bg-red"
          sub="iş yükü, baskı, rol"
        />
        <BalanceBar
          label="Kaynaklar"
          value={jdr.resource_avg}
          color="bg-green"
          sub="özerklik, destek, gelişim"
        />
      </div>

      <details className="group">
        <summary className="cursor-pointer text-[11px] font-medium text-accent hover:underline">
          6 talep + 6 kaynak detayı
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <DimensionList title="Talepler" items={jdr.demands} color="red" />
          <DimensionList title="Kaynaklar" items={jdr.resources} color="green" />
        </div>
      </details>
    </div>
  );
};

const BalanceBar = ({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number | null;
  color: string;
  sub: string;
}) => (
  <div>
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-ink-60">{label}</span>
      <span className="font-semibold tabular-nums text-ink">
        {value != null ? `%${Math.round(value)}` : '—'}
      </span>
    </div>
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-bg-3">
      {value != null && (
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      )}
    </div>
    <p className="mt-0.5 text-[10px] text-ink-40">{sub}</p>
  </div>
);

const DimensionList = ({
  title,
  items,
  color,
}: {
  title: string;
  items: JDRDimension[];
  color: 'red' | 'green';
}) => (
  <div>
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-40">
      {title}
    </p>
    <ul className="flex flex-col gap-1 text-[11px]">
      {items.map((d) => (
        <li key={d.key} className="flex items-center justify-between">
          <span className="text-ink-60">{d.label_tr}</span>
          <span className={`font-semibold tabular-nums ${color === 'red' ? 'text-red' : 'text-green'}`}>
            {d.score != null ? `%${Math.round(d.score)}` : '—'}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

const TrendPanel = ({ trend }: { trend: TrendPoint[] }) => {
  if (!trend.length) {
    return (
      <div className="rounded-lg border border-line bg-bg p-5 text-sm text-ink-40">
        30 günlük trend için henüz yeterli ölçüm yok.
      </div>
    );
  }

  const scores = trend.map((t) => t.score ?? 0);
  const max = Math.max(...scores, 3.5);
  const min = Math.min(...scores.filter((s) => s > 0), 1);
  const width = 600;
  const height = 120;

  const points = trend
    .map((t, i) => {
      const x = (i / Math.max(1, trend.length - 1)) * width;
      const y = height - ((t.score ?? 0 - min) / (max - min || 1)) * height;
      return `${x},${isFinite(y) ? y : height}`;
    })
    .join(' ');

  return (
    <div className="rounded-lg border border-line bg-bg p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-40">
          Son 90 Gün Trendi (Haftalık Ortalama)
        </p>
        <span className="text-[11px] text-ink-40">{trend.length} ölçüm</span>
      </div>

      <div className="relative">
        <svg
          width="100%"
          height={height + 24}
          viewBox={`0 0 ${width} ${height + 24}`}
          className="overflow-visible"
        >
          {/* Threshold lines */}
          <line
            x1="0"
            x2={width}
            y1={height - ((2.58 - min) / (max - min || 1)) * height}
            y2={height - ((2.58 - min) / (max - min || 1)) * height}
            stroke="var(--color-green)"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.4"
          />
          <line
            x1="0"
            x2={width}
            y1={height - ((3.01 - min) / (max - min || 1)) * height}
            y2={height - ((3.01 - min) / (max - min || 1)) * height}
            stroke="var(--color-red)"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.4"
          />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {trend.map((t, i) => {
            const x = (i / Math.max(1, trend.length - 1)) * width;
            const y = height - ((t.score ?? 0 - min) / (max - min || 1)) * height;
            return (
              <circle
                key={t.week_start}
                cx={x}
                cy={isFinite(y) ? y : height}
                r="3"
                fill="var(--color-accent)"
              >
                <title>
                  {t.week_start}: {t.score?.toFixed(2) ?? '—'}
                </title>
              </circle>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-40">
        <span>
          {trend[0]
            ? new Date(trend[0].week_start).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
              })
            : ''}
        </span>
        <span>
          {trend[trend.length - 1]
            ? new Date(trend[trend.length - 1]!.week_start).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
              })
            : ''}
        </span>
      </div>
    </div>
  );
};
