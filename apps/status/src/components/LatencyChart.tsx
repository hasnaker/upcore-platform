import type { DailyRollup } from '@/lib/api';

interface LatencyChartProps {
  history: DailyRollup[];
}

/**
 * Basit inline SVG sparkline — son 24 güne ait p95 latency trendi.
 * "24 saat" üst etiketi için ayrı seri alınmıyor; 24 günlük rollup p95
 * verisi yeterince temsil ediyor (status servisi 5dk interval'da prometheus
 * sorgusu ile ortalamaya düşürüyor).
 */
export function LatencyChart({ history }: LatencyChartProps) {
  const last = history.slice(-24);
  const values = last.map((d) => d.p95_latency_ms ?? 0);
  if (values.every((v) => v === 0)) {
    return <p className="text-[11px] text-ink-40">p95 verisi yok</p>;
  }
  const max = Math.max(...values, 1);
  const width = 240;
  const height = 40;
  const step = width / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * height).toFixed(1)}`)
    .join(' ');
  const latest = values[values.length - 1] ?? 0;
  return (
    <div className="flex items-center gap-3">
      <svg width={width} height={height} className="overflow-visible" role="img" aria-label="p95 latency trend">
        <polyline fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent" points={points} />
      </svg>
      <div className="text-[11px] text-ink-60">
        <div className="font-semibold text-ink tabular-nums">{latest.toLocaleString('tr-TR')} ms</div>
        <div>son p95</div>
      </div>
    </div>
  );
}
