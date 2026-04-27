import Link from 'next/link';
import { Rss, Bell } from 'lucide-react';
import {
  getComponents,
  getUnresolvedIncidents,
  getIncidents,
  getUpcomingMaintenance,
  rollupGlobalStatus,
  type ComponentWithHistory,
} from '@/lib/api';
import { ComponentCard } from '@/components/ComponentCard';
import { IncidentList } from '@/components/IncidentList';
import { MaintenanceCard } from '@/components/MaintenanceCard';
import { StatusBanner } from '@/components/StatusBanner';
import { categoryLabelTR } from '@/lib/labels';

export const revalidate = 30;
export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const [components, unresolved, recent, maintenance] = await Promise.all([
    getComponents(),
    getUnresolvedIncidents(),
    getIncidents(90),
    getUpcomingMaintenance(),
  ]);

  const global = rollupGlobalStatus(components);
  const grouped = groupByCategory(components);

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <header className="flex items-start justify-between gap-6 pb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">UpCore Status</h1>
          <p className="mt-1 text-sm text-ink-60">
            Platform sağlığı · her 30 saniyede güncellenir · 90 gün geriye giden uptime kayıtları.
          </p>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/status/subscribe"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-2 text-[13px] font-medium text-ink hover:border-accent"
          >
            <Bell className="h-4 w-4" aria-hidden />
            Abone ol
          </Link>
          <a
            href="/api/rss"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-2 text-[13px] font-medium text-ink hover:border-accent"
          >
            <Rss className="h-4 w-4" aria-hidden />
            RSS
          </a>
        </nav>
      </header>

      <StatusBanner status={global} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {maintenance.length > 0 && <MaintenanceCard windows={maintenance} />}

          {unresolved.length > 0 && (
            <IncidentList
              title="Aktif incident"
              emptyLabel=""
              incidents={unresolved}
            />
          )}

          {(['core', 'service', 'ml', 'integration'] as const).map((cat) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            return (
              <section
                key={cat}
                className="overflow-hidden rounded-xl border border-line bg-bg"
              >
                <header className="border-b border-line px-5 py-3">
                  <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
                    {categoryLabelTR[cat]}
                  </h2>
                </header>
                <ul>
                  {items.map((c) => (
                    <ComponentCard key={c.id} component={c} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <aside className="flex flex-col gap-6">
          <SLACard />
          <IncidentList
            title="Son 90 gün geçmişi"
            emptyLabel="Geçmişte incident bulunmuyor."
            incidents={recent.filter((i) => i.status === 'resolved' || i.status === 'postmortem')}
            limit={6}
          />
        </aside>
      </div>

      <footer className="mt-10 border-t border-line pt-6 text-center text-[11px] text-ink-40">
        UpCore Status · {new Date().getFullYear()} · Bu sayfa ayrı bulutta barındırılır.
      </footer>
    </main>
  );
}

function groupByCategory(comps: ComponentWithHistory[]): Record<string, ComponentWithHistory[]> {
  const out: Record<string, ComponentWithHistory[]> = {};
  for (const c of comps) {
    (out[c.category] = out[c.category] ?? []).push(c);
  }
  return out;
}

function SLACard() {
  const rows: { name: string; target: string; tone: string }[] = [
    { name: 'Enterprise', target: '%99.9', tone: 'text-green' },
    { name: 'Pro', target: '%99.5', tone: 'text-amber' },
    { name: 'KOBİ', target: '%99.0', tone: 'text-accent' },
  ];
  return (
    <section className="rounded-xl border border-line bg-bg p-5">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">SLA hedefleri</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li
            key={r.name}
            className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
          >
            <span className="text-ink">{r.name}</span>
            <span className={`font-semibold tabular-nums ${r.tone}`}>{r.target}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-ink-40">
        SLA ihlali durumunda kredi otomatik hesaplanır. Enterprise müşteriler için aylık şeffaflık raporu gönderilir.
      </p>
    </section>
  );
}
