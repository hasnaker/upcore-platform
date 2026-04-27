import { CalendarClock } from 'lucide-react';
import type { MaintenanceWindow } from '@/lib/api';
import { formatDateTR } from '@/lib/labels';

interface MaintenanceCardProps {
  windows: MaintenanceWindow[];
}

export function MaintenanceCard({ windows }: MaintenanceCardProps) {
  if (windows.length === 0) return null;
  return (
    <section className="rounded-xl border border-accent/30 bg-accent-soft p-5">
      <header className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-accent">
        <CalendarClock className="h-4 w-4" aria-hidden />
        Planlı bakım
      </header>
      <ul className="space-y-3">
        {windows.map((w) => (
          <li key={w.id} className="rounded-lg border border-accent/20 bg-bg px-4 py-3">
            <p className="text-sm font-semibold text-ink">{w.title}</p>
            <p className="mt-1 text-[12px] text-ink-60">{w.description}</p>
            <p className="mt-2 text-[11px] uppercase tracking-widest text-accent">
              {formatDateTR(w.scheduled_start)} → {formatDateTR(w.scheduled_end)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
