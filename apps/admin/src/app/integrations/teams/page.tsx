'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, MessageSquare, Plug, Send, Shield, Unplug } from 'lucide-react';
import { Button } from '@upcore/design-system';
import { AdminShell } from '@/components/AdminShell';

interface TeamsStatus {
  installed: boolean;
  aad_tenant_id?: string;
  service_url?: string;
  bot_user_id?: string;
  installed_at?: string;
  allow_dm_interventions?: boolean;
}

async function fetchStatus(): Promise<TeamsStatus> {
  const r = await fetch('/api/v1/admin/integrations/teams/status', { cache: 'no-store' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return r.json();
}

async function sendTestMessage(): Promise<void> {
  const r = await fetch('/api/v1/admin/integrations/teams/test', { method: 'POST' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
}

async function uninstall(): Promise<void> {
  const r = await fetch('/api/v1/admin/integrations/teams/uninstall', { method: 'DELETE' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
}

export default function TeamsIntegrationPage() {
  const qc = useQueryClient();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (handled || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === '1') {
      toast.success('Microsoft Teams workspace bağlandı.');
      setHandled(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('error')) {
      toast.error(`Teams bağlantısı başarısız: ${params.get('error')}`);
      setHandled(true);
    }
  }, [handled]);

  const status = useQuery<TeamsStatus, Error>({
    queryKey: ['teams-status'] as const,
    queryFn: fetchStatus,
    staleTime: 30_000,
  });

  const testMut = useMutation({
    mutationFn: sendTestMessage,
    onSuccess: () => toast.success('Test kartı gönderildi.'),
    onError: (e: Error) => toast.error(e.message),
  });

  const uninstallMut = useMutation({
    mutationFn: uninstall,
    onSuccess: async () => {
      toast.success('Teams bağlantısı kaldırıldı.');
      await qc.invalidateQueries({ queryKey: ['teams-status'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = status.data;

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Microsoft Teams</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-60">
            Teams ile UpCore&apos;u bağlayın — haftalık pulse hatırlatıcıları ve KVKK onaylı müdahale
            kartları Adaptive Card 1.5 olarak çalışanlarınıza iletilir. <code>@UpCore pulse</code>,
            <code>@UpCore feedback</code> ve <code>@UpCore help</code> komutları desteklenir.
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
                  <h2 className="text-base font-semibold text-ink">
                    Henüz bir Teams organizasyonu bağlı değil
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-ink-60">
                    Azure AD global admin onayı gerekir. Botu eklemek için aşağıdaki akışı başlatın;
                    yönlendirmeniz Microsoft kimlik platformuna yapılacak.
                  </p>
                </div>
              </div>
              <a
                href="/api/v1/admin/integrations/teams/install"
                className="inline-flex items-center gap-2 rounded-md bg-[#4B53BC] px-4 py-2 text-sm font-medium text-white hover:bg-[#6168d6]"
                data-testid="teams-install-btn"
              >
                <MessageSquare className="h-4 w-4" />
                Teams&apos;e Ekle
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
                  <h2 className="text-base font-semibold text-ink">Teams bağlı</h2>
                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
                    <Def label="AAD Tenant" value={s.aad_tenant_id} mono />
                    <Def label="Bot User" value={s.bot_user_id} mono />
                    <Def label="Service URL" value={s.service_url} mono />
                    <Def
                      label="Kurulum"
                      value={s.installed_at ? new Date(s.installed_at).toLocaleString('tr-TR') : '—'}
                    />
                  </dl>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  {testMut.isPending ? 'Gönderiliyor…' : 'Test kartı gönder'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Teams entegrasyonunu kaldırmak istediğine emin misin?')) {
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
          <h3 className="text-sm font-semibold text-ink">Desteklenen Özellikler</h3>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-[13px] text-ink sm:grid-cols-2">
            <Feat icon={Shield} title="Müdahale onayı" desc="KVKK onaylı Adaptive Card kart" />
            <Feat icon={MessageSquare} title="Pulse hatırlatıcı" desc="Haftalık anket DM" />
            <Feat icon={Send} title="Slash komutları" desc="@UpCore pulse · feedback · help" />
            <Feat icon={Plug} title="Proaktif DM" desc="Bot Framework servis URL'i ile" />
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
