'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, Plus, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/AdminShell';
import { IncidentCreateDialog } from './_components/IncidentCreateDialog';
import { MaintenanceCreateDialog } from './_components/MaintenanceCreateDialog';
import { IncidentRow } from './_components/IncidentRow';
import type { AdminComponent, AdminIncident, AdminMaintenance } from './_components/types';

export default function AdminStatusPage() {
  const qc = useQueryClient();
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);

  const components = useQuery<AdminComponent[]>({
    queryKey: ['admin', 'status', 'components'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/status-proxy/components', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { components: AdminComponent[] };
      return data.components ?? [];
    },
  });

  const incidents = useQuery<AdminIncident[]>({
    queryKey: ['admin', 'status', 'incidents'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/status-proxy/incidents?days=90', {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { incidents: AdminIncident[] };
      return data.incidents ?? [];
    },
  });

  const maintenance = useQuery<AdminMaintenance[]>({
    queryKey: ['admin', 'status', 'maintenance'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/status-proxy/maintenance', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { scheduled_maintenances: AdminMaintenance[] };
      return data.scheduled_maintenances ?? [];
    },
  });

  const overrideStatus = useMutation<
    void,
    Error,
    { componentId: string; status: string }
  >({
    mutationFn: async ({ componentId, status }) => {
      const res = await fetch(`/api/v1/admin/status-proxy/components/${componentId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      toast.success('Bileşen durumu güncellendi');
      void qc.invalidateQueries({ queryKey: ['admin', 'status', 'components'] });
    },
    onError: (err) => toast.error(`Güncelleme başarısız: ${err.message}`),
  });

  const active = incidents.data?.filter((i) => i.status !== 'resolved' && i.status !== 'postmortem') ?? [];
  const resolved = incidents.data?.filter((i) => i.status === 'resolved' || i.status === 'postmortem') ?? [];

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Status Page</h1>
            <p className="mt-1 text-sm text-ink-60">
              Incident başlat, update yayınla, planlı bakım ekle. Değişiklikler status.upcore.io
              sayfasına 30 saniye içinde yansır.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIncidentDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Incident başlat
            </button>
            <button
              type="button"
              onClick={() => setMaintenanceDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-2 text-[13px] font-medium text-ink hover:border-accent"
            >
              <CalendarClock className="h-4 w-4" aria-hidden />
              Planlı bakım
            </button>
            <Link
              href="https://status.upcore.io/status"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-2 text-[13px] font-medium text-ink hover:border-accent"
            >
              Public sayfa
            </Link>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-line bg-bg">
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
              Aktif incident
            </h2>
            <button
              type="button"
              onClick={() => void qc.invalidateQueries({ queryKey: ['admin', 'status'] })}
              className="inline-flex items-center gap-1 text-[12px] text-ink-60 hover:text-ink"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
              Yenile
            </button>
          </header>
          {incidents.isLoading ? (
            <p className="px-5 py-6 text-sm text-ink-40">Yükleniyor…</p>
          ) : active.length === 0 ? (
            <p className="flex items-center gap-2 px-5 py-6 text-sm text-green">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Aktif incident yok.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {active.map((i) => (
                <IncidentRow key={i.id} incident={i} active />
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-bg">
          <header className="border-b border-line px-5 py-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
              Bileşenler ({components.data?.length ?? 0})
            </h2>
          </header>
          {components.isLoading ? (
            <p className="px-5 py-6 text-sm text-ink-40">Yükleniyor…</p>
          ) : (
            <ul className="divide-y divide-line">
              {components.data?.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="text-[11px] text-ink-40">
                      {c.category} · {c.code}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-widest ${
                        c.status === 'operational'
                          ? 'bg-green-soft text-green'
                          : c.status === 'major_outage'
                            ? 'bg-red-soft text-red'
                            : 'bg-amber-soft text-amber'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                    <select
                      aria-label={`${c.name} durumunu değiştir`}
                      value={c.status}
                      onChange={(e) =>
                        overrideStatus.mutate({
                          componentId: c.id,
                          status: e.target.value,
                        })
                      }
                      className="rounded-md border border-line bg-bg px-2 py-1 text-[12px]"
                    >
                      <option value="operational">operational</option>
                      <option value="degraded">degraded</option>
                      <option value="partial_outage">partial_outage</option>
                      <option value="major_outage">major_outage</option>
                      <option value="maintenance">maintenance</option>
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-bg">
          <header className="border-b border-line px-5 py-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
              Planlı bakım
            </h2>
          </header>
          {maintenance.data && maintenance.data.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-40">Planlı bakım yok.</p>
          ) : (
            <ul className="divide-y divide-line">
              {maintenance.data?.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <CalendarClock className="h-4 w-4 text-accent" aria-hidden />
                  <div className="flex-1">
                    <p className="font-medium text-ink">{m.title}</p>
                    <p className="text-[11px] text-ink-40">
                      {new Date(m.scheduled_start).toLocaleString('tr-TR')} →{' '}
                      {new Date(m.scheduled_end).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] uppercase text-accent">
                    {m.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-bg">
          <header className="border-b border-line px-5 py-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
              Geçmiş (90 gün)
            </h2>
          </header>
          {resolved.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-40">Geçmişte çözülmüş incident yok.</p>
          ) : (
            <ul className="divide-y divide-line">
              {resolved.map((i) => (
                <IncidentRow key={i.id} incident={i} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <IncidentCreateDialog
        open={incidentDialogOpen}
        components={components.data ?? []}
        onClose={() => setIncidentDialogOpen(false)}
        onCreated={() => {
          setIncidentDialogOpen(false);
          void qc.invalidateQueries({ queryKey: ['admin', 'status'] });
        }}
      />
      <MaintenanceCreateDialog
        open={maintenanceDialogOpen}
        components={components.data ?? []}
        onClose={() => setMaintenanceDialogOpen(false)}
        onCreated={() => {
          setMaintenanceDialogOpen(false);
          void qc.invalidateQueries({ queryKey: ['admin', 'status'] });
        }}
      />
    </AdminShell>
  );
}
