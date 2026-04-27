import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { getComponents, getIncident, type Component } from '@/lib/api';
import {
  formatDateTR,
  incidentImpactLabelTR,
  incidentStatusLabelTR,
  statusColorClass,
} from '@/lib/labels';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const data = await getIncident(id);
  if (!data) return { title: 'Incident' };
  return { title: data.incident.title };
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [data, components] = await Promise.all([getIncident(id), getComponents()]);
  if (!data) return notFound();
  const { incident, updates } = data;
  const compMap = new Map<string, Component>(components.map((c) => [c.id, c]));
  const affectedComps = incident.component_ids
    .map((cid) => compMap.get(cid))
    .filter((c): c is Component => Boolean(c));

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <Link
        href="/status/incidents"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-60 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Tüm incidentlar
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-ink">{incident.title}</h1>
      <p className="mt-1 text-sm text-ink-60">
        Başlangıç {formatDateTR(incident.started_at)}
        {incident.resolved_at ? ` · Çözüm ${formatDateTR(incident.resolved_at)}` : ' · Halen devam ediyor'}
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Durum" value={incidentStatusLabelTR[incident.status]} />
        <Kpi label="Etki" value={incidentImpactLabelTR[incident.impact]} />
        <Kpi
          label="Süre"
          value={durationLabel(incident.started_at, incident.resolved_at ?? null)}
        />
      </dl>

      {affectedComps.length > 0 && (
        <section className="mt-6 rounded-xl border border-line bg-bg">
          <header className="border-b border-line px-5 py-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
              Etkilenen bileşenler
            </h2>
          </header>
          <ul className="divide-y divide-line">
            {affectedComps.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-full ${statusColorClass[c.status]}`}
                />
                <span className="text-ink">{c.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-line bg-bg">
        <header className="border-b border-line px-5 py-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
            Olay zaman çizelgesi
          </h2>
        </header>
        {updates.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-40">Henüz update yayımlanmadı.</p>
        ) : (
          <ol className="relative">
            {updates
              .slice()
              .reverse()
              .map((u, idx) => (
                <li key={u.id} className="border-t border-line px-5 py-4 first:border-t-0">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-bg-2 px-2 py-0.5 text-[11px] uppercase tracking-widest text-ink-60">
                      {incidentStatusLabelTR[u.status]}
                    </span>
                    <span className="text-[11px] text-ink-40">{formatDateTR(u.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{u.body}</p>
                  {u.author && (
                    <p className="mt-1 text-[11px] text-ink-40">
                      {idx === 0 ? 'Son güncelleme' : 'Yazan'} · {u.author}
                    </p>
                  )}
                </li>
              ))}
          </ol>
        )}
      </section>

      {(incident.postmortem_url || incident.postmortem_summary) && (
        <section className="mt-6 rounded-xl border border-line bg-bg p-5">
          <header className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
            <BookOpen className="h-4 w-4" aria-hidden />
            Post-mortem
          </header>
          {incident.postmortem_summary && (
            <p className="whitespace-pre-wrap text-sm text-ink-80">{incident.postmortem_summary}</p>
          )}
          {incident.postmortem_url && (
            <a
              href={incident.postmortem_url}
              className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Detaylı post-mortem
            </a>
          )}
        </section>
      )}
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <dt className="text-[11px] uppercase tracking-widest text-ink-40">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-ink">{value}</dd>
    </div>
  );
}

function durationLabel(startISO: string, endISO: string | null): string {
  const start = new Date(startISO).getTime();
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  const min = Math.max(0, Math.round((end - start) / 60_000));
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const rm = min % 60;
  return `${h} sa ${rm} dk`;
}
