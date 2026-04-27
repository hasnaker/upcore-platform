'use client';

import { useMemo } from 'react';

interface PlanCount {
  plan_id: string;
  plan_code: string;
  plan_name: string;
  monthly_price_try: number;
  subscriptions: number;
  mrr_contribution_try: number;
}

interface MRRTrendPoint {
  month: string;
  mrr_try: number;
  active_subscriptions: number;
}

const PIE_COLORS = ['#5E5CE6', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#A855F7', '#F97316'];

// ---------------------------------------------------------------------------
// PlanDistributionPie — pure-SVG donut chart with legend.
// ---------------------------------------------------------------------------

export function PlanDistributionPie({ data }: { data: PlanCount[] }) {
  const total = data.reduce((s, d) => s + d.subscriptions, 0);

  const slices = useMemo(() => {
    if (total === 0) {
      return [];
    }
    let offset = 0;
    return data
      .filter((d) => d.subscriptions > 0)
      .map((d, i) => {
        const pct = d.subscriptions / total;
        const slice = {
          key: d.plan_id,
          label: d.plan_name,
          value: d.subscriptions,
          pct,
          color: PIE_COLORS[i % PIE_COLORS.length],
          offset,
        };
        offset += pct;
        return slice;
      });
  }, [data, total]);

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-ink-40">Henüz aktif abonelik yok</p>
    );
  }

  const radius = 64;
  const innerRadius = 38;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 160 160"
        role="img"
        aria-label="Plan dağılımı donut grafiği"
        className="h-44 w-44"
      >
        {slices.map((s) => {
          const dasharray = `${s.pct * circumference} ${circumference}`;
          const dashoffset = -s.offset * circumference;
          return (
            <circle
              key={s.key}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={radius - innerRadius}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="fill-[color:var(--color-ink)] text-[12px] font-semibold"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-[color:var(--color-ink-40,#737373)] text-[10px]"
        >
          abonelik
        </text>
      </svg>
      <ul className="flex w-full flex-col gap-1 text-[12px]">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="flex-1 text-ink-60">{s.label}</span>
            <span className="tabular-nums text-ink">{s.value}</span>
            <span className="tabular-nums text-ink-40">({(s.pct * 100).toFixed(1)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MRRTrendChart — pure-SVG area chart for last-12-months MRR.
// ---------------------------------------------------------------------------

export function MRRTrendChart({ data }: { data: MRRTrendPoint[] }) {
  const width = 720;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 56 };

  const maxMRR = Math.max(1, ...data.map((d) => d.mrr_try));
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (d.mrr_try / maxMRR) * innerH,
    value: d.mrr_try,
    label: d.month,
    subs: d.active_subscriptions,
  }));

  // Build the area path.
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1]!.x.toFixed(2)} ${(
          padding.top + innerH
        ).toFixed(2)} L ${points[0]!.x.toFixed(2)} ${(padding.top + innerH).toFixed(2)} Z`
      : '';

  // Y-axis ticks.
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = (maxMRR * (ticks - i)) / ticks;
    const y = padding.top + innerH - (v / maxMRR) * innerH;
    return { v, y };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Son 12 ay MRR trendi"
      className="h-56 w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="mrrArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5E5CE6" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#5E5CE6" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={t.y}
            x2={width - padding.right}
            y2={t.y}
            stroke="#EDEDED"
            strokeWidth={1}
          />
          <text
            x={padding.left - 6}
            y={t.y + 3}
            textAnchor="end"
            className="fill-[#737373] text-[9px]"
          >
            {formatShort(t.v)}
          </text>
        </g>
      ))}

      {/* Area + line */}
      {areaPath && <path d={areaPath} fill="url(#mrrArea)" />}
      {linePath && <path d={linePath} stroke="#5E5CE6" strokeWidth={1.75} fill="none" />}

      {/* Data points with accessibility-first titles */}
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={2.5} fill="#5E5CE6" />
          <title>
            {p.label}: {formatTRY(p.value)} · {p.subs} abone
          </title>
        </g>
      ))}

      {/* X-axis labels — every 2nd month to avoid crowding */}
      {points.map((p, i) =>
        i % 2 === 0 ? (
          <text
            key={p.label}
            x={p.x}
            y={height - padding.bottom + 14}
            textAnchor="middle"
            className="fill-[#737373] text-[9px]"
          >
            {p.label.slice(5)}/{p.label.slice(2, 4)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function formatShort(v: number): string {
  if (v >= 1_000_000) {
    return `${(v / 1_000_000).toFixed(1)}M`;
  }
  if (v >= 1_000) {
    return `${(v / 1_000).toFixed(0)}K`;
  }
  return v.toFixed(0);
}

function formatTRY(v: number): string {
  return `₺ ${v.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
}
