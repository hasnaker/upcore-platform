import type { ComponentWithHistory } from '@/lib/api';
import { monthlyUptimePct, statusColorClass, statusLabelTR } from '@/lib/labels';
import { LatencyChart } from './LatencyChart';
import { UptimeBar } from './UptimeBar';

interface ComponentCardProps {
  component: ComponentWithHistory;
}

export function ComponentCard({ component }: ComponentCardProps) {
  const uptime = monthlyUptimePct(component.history);
  return (
    <li className="grid grid-cols-1 gap-3 border-t border-line px-5 py-4 first:border-t-0 md:grid-cols-[220px_1fr_200px] md:items-center">
      <div>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={`inline-block h-2.5 w-2.5 rounded-full ${statusColorClass[component.status]}`}
          />
          <span className="text-sm font-medium text-ink">{component.name}</span>
        </div>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-ink-40">
          {statusLabelTR[component.status]}
        </p>
      </div>
      <div>
        <UptimeBar history={component.history} />
        <div className="mt-1 flex items-center justify-between text-[11px] text-ink-40">
          <span>90 gün önce</span>
          <span className="tabular-nums">{uptime.toFixed(2)}% · 30g</span>
          <span>bugün</span>
        </div>
      </div>
      <div className="text-right">
        <LatencyChart history={component.history} />
      </div>
    </li>
  );
}
