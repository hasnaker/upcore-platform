import type { DailyRollup } from '@/lib/api';
import { formatDayTR } from '@/lib/labels';

interface UptimeBarProps {
  history: DailyRollup[];
  days?: number;
}

/**
 * 90 günlük (default) pass/fail daily uptime bar.
 * Her bar 1 gün. Gün için veri yoksa gri, %100 başarılı ise yeşil,
 * kısmi fail sarı, çoğunluk fail kırmızı.
 */
export function UptimeBar({ history, days = 90 }: UptimeBarProps) {
  const bucket: Record<string, DailyRollup> = {};
  for (const h of history) bucket[h.day.slice(0, 10)] = h;

  const today = new Date();
  const bars: Array<{ day: string; row: DailyRollup | null }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    bars.push({ day: key, row: bucket[key] ?? null });
  }

  return (
    <div className="flex h-8 w-full items-end gap-[2px]" aria-label="90 günlük uptime grafiği">
      {bars.map((b) => {
        const cls = colorFor(b.row);
        const ratio = b.row && b.row.total_probes > 0
          ? (b.row.total_probes - b.row.failed_probes) / b.row.total_probes
          : null;
        const title = b.row
          ? `${formatDayTR(b.day)} · ${ratio === null ? 'veri yok' : `${(ratio * 100).toFixed(2)}% uptime`} (${b.row.failed_probes} fail / ${b.row.total_probes} probe)`
          : `${formatDayTR(b.day)} · veri yok`;
        return (
          <div
            key={b.day}
            title={title}
            className={`h-full flex-1 rounded-[1px] ${cls} transition-opacity hover:opacity-80`}
          />
        );
      })}
    </div>
  );
}

function colorFor(row: DailyRollup | null): string {
  if (!row || row.total_probes === 0) return 'bg-bg-3 opacity-60';
  const rate = (row.total_probes - row.failed_probes) / row.total_probes;
  if (rate >= 0.995) return 'bg-green';
  if (rate >= 0.95) return 'bg-amber';
  return 'bg-red';
}
