import Link from 'next/link';
import { ArrowRight, AlertOctagon, CheckCircle2 } from 'lucide-react';
import type { Incident } from '@/lib/api';
import { formatDateTR, incidentImpactLabelTR, incidentStatusLabelTR } from '@/lib/labels';

interface IncidentListProps {
  title: string;
  emptyLabel: string;
  incidents: Incident[];
  limit?: number;
}

export function IncidentList({ title, emptyLabel, incidents, limit }: IncidentListProps) {
  const rows = limit ? incidents.slice(0, limit) : incidents;
  return (
    <section className="rounded-xl border border-line bg-bg">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">{title}</h2>
        <Link
          href="/status/incidents"
          className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline"
        >
          Tümünü gör
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-40">{emptyLabel}</p>
      ) : (
        <ul>
          {rows.map((i) => {
            const resolved = i.status === 'resolved' || i.status === 'postmortem';
            const Icon = resolved ? CheckCircle2 : AlertOctagon;
            const tone = resolved ? 'text-green' : i.impact === 'critical' ? 'text-red' : 'text-amber';
            return (
              <li key={i.id} className="border-t border-line first:border-t-0">
                <Link
                  href={`/status/incidents/${i.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-bg-2"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{i.title}</p>
                    <p className="text-[11px] text-ink-40">
                      {incidentStatusLabelTR[i.status]} · {incidentImpactLabelTR[i.impact]} ·{' '}
                      {formatDateTR(i.started_at)}
                      {i.resolved_at ? ` → ${formatDateTR(i.resolved_at)}` : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-40" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
