'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Calendar, Cloud, Plug, RefreshCw, Unplug, Users } from 'lucide-react';
import { Button } from '@upcore/design-system';
import { AdminShell } from '@/components/AdminShell';

interface GoogleStatus {
  installed: boolean;
  workspace_domain?: string;
  authed_user_email?: string;
  directory_sync_enabled?: boolean;
  calendar_enabled?: boolean;
  drive_enabled?: boolean;
  last_sync_at?: string;
  total_users?: number;
  installed_at?: string;
}

async function fetchStatus(): Promise<GoogleStatus> {
  const r = await fetch('/api/v1/admin/integrations/google/status', { cache: 'no-store' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return r.json();
}

async function runSync(): Promise<void> {
  const r = await fetch('/api/v1/admin/integrations/google/sync', { method: 'POST' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
}

async function uninstall(): Promise<void> {
  const r = await fetch('/api/v1/admin/integrations/google/uninstall', { method: 'DELETE' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
}

export default function GoogleIntegrationPage() {
  const qc = useQueryClient();
  const status = useQuery<GoogleStatus, Error>({
    queryKey: ['google-status'] as const,
    queryFn: fetchStatus,
    staleTime: 30_000,
  });
  const syncMut = useMutation({
    mutationFn: runSync,
    onSuccess: () => {
      toast.success('Directory sync tetiklendi.');
      qc.invalidateQueries({ queryKey: ['google-status'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const uninstallMut = useMutation({
    mutationFn: uninstall,
    onSuccess: () => {
      toast.success('Google bağlantısı kaldırıldı.');
      qc.invalidateQueries({ queryKey: ['google-status'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = status.data;

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Google Workspace</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-60">
            Directory üzerinden günlük delta çalışan senkronizasyonu, müdahale check-in&apos;lerinin
            Google Calendar&apos;a eklenmesi ve KVKK belgeleri için Drive depolama opsiyonu.
          </p>
        </header>

        <section className="rounded-lg border border-line bg-bg p-6">
          {status.isLoading && <p className="text-sm text-ink-40">Durum yükleniyor…</p>}
          {status.isError && (
            <div className="flex items-center gap-2 rounded-md bg-red-soft px-3 py-2 text-sm text-red">
              <AlertCircle className="h-4 w-4" />
              {status.error.message}
            </div>
          )}

          {s && !s.installed && (
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft">
                  <Plug className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink">Henüz bir Workspace bağlı değil</h2>
                  <p className="mt-1 max-w-xl text-sm text-ink-60">
                    Super admin hesabı ile OAuth onayı gerekir. İzinler: admin.directory (read-only),
                    calendar.events, drive.file.
                  </p>
                </div>
              </div>
              <a
                href="/api/v1/admin/integrations/google/install"
                className="inline-flex items-center gap-2 rounded-md bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white hover:bg-[#185abc]"
              >
                Google ile bağlan
              </a>
            </div>
          )}

          {s && s.installed && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-soft">
                  <CheckCircle2 className="h-5 w-5 text-green" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    {s.workspace_domain} bağlı
                  </h2>
                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
                    <Def label="Admin" value={s.authed_user_email} mono />
                    <Def label="Toplam kullanıcı" value={String(s.total_users ?? 0)} />
                    <Def label="Directory" value={s.directory_sync_enabled ? 'Açık' : 'Kapalı'} />
                    <Def label="Calendar" value={s.calendar_enabled ? 'Açık' : 'Kapalı'} />
                    <Def label="Drive" value={s.drive_enabled ? 'Açık' : 'Kapalı'} />
                    <Def
                      label="Son sync"
                      value={s.last_sync_at ? new Date(s.last_sync_at).toLocaleString('tr-TR') : '—'}
                    />
                  </dl>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Directory sync çalıştır
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Google bağlantısını kaldırmak istediğine emin misin?')) {
                      uninstallMut.mutate();
                    }
                  }}
                  disabled={uninstallMut.isPending}
                >
                  <Unplug className="mr-2 h-4 w-4" />
                  Bağlantıyı kaldır
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-bg p-6">
          <h3 className="text-sm font-semibold text-ink">Özellikler</h3>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-[13px] text-ink sm:grid-cols-2">
            <Feat icon={Users} title="Directory sync" desc="Günlük delta + full re-sync" />
            <Feat icon={Calendar} title="Calendar check-in" desc="Müdahale 4/8/12 haftada Meet ile" />
            <Feat icon={Cloud} title="Drive arşiv (ops.)" desc="KVKK belgeleri drive.file scope" />
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}

function Def({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-28 shrink-0 text-ink-40">{label}</dt>
      <dd className={`text-ink ${mono ? 'font-mono text-[11px]' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

function Feat({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-md bg-bg-2 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 text-accent" />
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-[11px] text-ink-60">{desc}</p>
      </div>
    </li>
  );
}
