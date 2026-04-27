'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, MessageSquare, Plug, Send, Shield, Unplug } from 'lucide-react';
import { Button } from '@upcore/design-system';
import { AdminShell } from '@/components/AdminShell';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlackStatusResponse {
  installed: boolean;
  team_id?: string;
  team_name?: string;
  enterprise_id?: string;
  app_id?: string;
  bot_user_id?: string;
  scope?: string;
  default_channel_id?: string;
  webhook_channel?: string;
  allow_dm_interventions?: boolean;
  installed_at?: string;
  installed_by?: string;
}

// ---------------------------------------------------------------------------
// API calls — all routed through the admin proxy so the Clerk JWT is added.
// ---------------------------------------------------------------------------

async function fetchStatus(): Promise<SlackStatusResponse> {
  const r = await fetch('/api/v1/admin/integrations/slack/status', { cache: 'no-store' });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `HTTP ${r.status}`);
  }
  return r.json();
}

async function sendTestMessage(): Promise<{ status: string; ts?: string; channel?: string; via?: string }> {
  const r = await fetch('/api/v1/admin/integrations/slack/test', { method: 'POST' });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `HTTP ${r.status}`);
  }
  return r.json();
}

async function updateSettings(input: { allow_dm_interventions?: boolean }): Promise<void> {
  const r = await fetch('/api/v1/admin/integrations/slack/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `HTTP ${r.status}`);
  }
}

async function uninstall(): Promise<void> {
  const r = await fetch('/api/v1/admin/integrations/slack/uninstall', { method: 'DELETE' });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `HTTP ${r.status}`);
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SlackIntegrationPage() {
  const queryClient = useQueryClient();
  const [toastKeyHandled, setToastKeyHandled] = useState(false);

  // Surface ?connected=1 / ?error= query parameters from OAuth callback.
  useEffect(() => {
    if (toastKeyHandled || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === '1') {
      toast.success('Slack workspace başarıyla bağlandı.');
      setToastKeyHandled(true);
      // clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('error')) {
      toast.error(`Slack bağlantısı başarısız: ${params.get('error') ?? 'bilinmeyen hata'}`);
      setToastKeyHandled(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toastKeyHandled]);

  const statusQuery = useQuery<SlackStatusResponse, Error>({
    queryKey: ['slack-status'] as const,
    queryFn: fetchStatus,
    staleTime: 30_000,
  });

  const testMutation = useMutation({
    mutationFn: sendTestMessage,
    onSuccess: () => toast.success('Test mesajı gönderildi.'),
    onError: (err) => toast.error(err.message),
  });

  const settingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: async () => {
      toast.success('Ayarlar güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['slack-status'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const uninstallMutation = useMutation({
    mutationFn: uninstall,
    onSuccess: async () => {
      toast.success('Slack bağlantısı kaldırıldı.');
      await queryClient.invalidateQueries({ queryKey: ['slack-status'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const status = statusQuery.data;

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Slack Entegrasyonu</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-60">
            Slack workspace bağlandığında çalışanlar UpCore bildirimlerini tercih ettikleri
            kanaldan alır. Hoş geldin mesajları, pulse anket hatırlatmaları ve KVKK onay
            gerektirmiş müdahale DM&apos;leri Slack üzerinden iletilir.
          </p>
        </header>

        {/* Status card */}
        <section className="rounded-lg border border-line bg-bg p-6">
          {statusQuery.isLoading && (
            <p className="text-sm text-ink-40">Durum yükleniyor…</p>
          )}
          {statusQuery.isError && (
            <div className="flex items-center gap-2 rounded-md bg-red-soft px-3 py-2 text-sm text-red">
              <AlertCircle className="h-4 w-4" />
              {statusQuery.error.message}
            </div>
          )}

          {status && !status.installed && (
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft">
                  <Plug className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Henüz bir Slack workspace bağlı değil
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-ink-60">
                    Aşağıdaki butona tıklayarak Slack OAuth akışını başlat. Workspace
                    yöneticisinin onayı gerekir; botun çalışması için izinler (chat:write,
                    commands, users:read.email, incoming-webhook) istenir.
                  </p>
                </div>
              </div>
              <a
                href="/api/v1/admin/integrations/slack/install"
                className="inline-flex items-center gap-2 rounded-md bg-[#4A154B] px-4 py-2 text-sm font-medium text-white hover:bg-[#611f62]"
                data-testid="slack-install-btn"
              >
                <svg viewBox="0 0 122.8 122.8" className="h-4 w-4" aria-hidden>
                  <path fill="#e01e5a" d="M25.8 77.6a12.9 12.9 0 1 1-12.9-12.9h12.9zM32.3 77.6a12.9 12.9 0 1 1 25.8 0v32.3a12.9 12.9 0 1 1-25.8 0z" />
                  <path fill="#36c5f0" d="M45.2 25.8a12.9 12.9 0 1 1 12.9-12.9v12.9zM45.2 32.3a12.9 12.9 0 1 1 0 25.8H12.9a12.9 12.9 0 1 1 0-25.8z" />
                  <path fill="#2eb67d" d="M97 45.2a12.9 12.9 0 1 1 12.9 12.9H97zM90.5 45.2a12.9 12.9 0 1 1-25.8 0V12.9a12.9 12.9 0 1 1 25.8 0z" />
                  <path fill="#ecb22e" d="M77.6 97a12.9 12.9 0 1 1-12.9 12.9V97zM77.6 90.5a12.9 12.9 0 1 1 0-25.8h32.3a12.9 12.9 0 1 1 0 25.8z" />
                </svg>
                Slack&apos;e Ekle
              </a>
            </div>
          )}

          {status && status.installed && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-soft">
                  <CheckCircle2 className="h-5 w-5 text-green" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-ink">
                    {status.team_name ?? 'Slack workspace'} bağlı
                  </h2>
                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
                    <DefItem label="Team ID" value={status.team_id} mono />
                    <DefItem label="Bot kullanıcı" value={status.bot_user_id} mono />
                    <DefItem label="App ID" value={status.app_id} mono />
                    <DefItem
                      label="Varsayılan kanal"
                      value={status.default_channel_id || status.webhook_channel || '—'}
                      mono
                    />
                    <DefItem label="Scope" value={status.scope} mono />
                    <DefItem
                      label="Kurulum tarihi"
                      value={
                        status.installed_at
                          ? new Date(status.installed_at).toLocaleString('tr-TR')
                          : '—'
                      }
                    />
                  </dl>
                </div>
              </div>

              {/* KVKK opt-in toggle for intervention DMs */}
              <div className="flex items-start justify-between gap-4 rounded-md border border-line bg-bg-2 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-4 w-4 text-amber" />
                  <div>
                    <p className="text-sm font-medium text-ink">
                      Müdahale DM&apos;lerine izin ver (KVKK)
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-60">
                      Etkinleştirildiğinde, çalışanlara önerilen müdahaleler Slack DM olarak
                      iletilir. Açık rıza gerekir; çalışan istediği zaman geri çekebilir.
                    </p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <span className="text-[11px] text-ink-40">
                    {status.allow_dm_interventions ? 'Aktif' : 'Kapalı'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={status.allow_dm_interventions ?? false}
                    data-testid="slack-kvkk-toggle"
                    onClick={() =>
                      settingsMutation.mutate({
                        allow_dm_interventions: !(status.allow_dm_interventions ?? false),
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      status.allow_dm_interventions ? 'bg-accent' : 'bg-ink-20'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        status.allow_dm_interventions ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  data-testid="slack-test-btn"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {testMutation.isPending ? 'Gönderiliyor…' : 'Test mesajı gönder'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Slack entegrasyonunu kaldırmak istediğine emin misin?')) {
                      uninstallMutation.mutate();
                    }
                  }}
                  disabled={uninstallMutation.isPending}
                  data-testid="slack-uninstall-btn"
                >
                  <Unplug className="mr-2 h-4 w-4" />
                  {uninstallMutation.isPending ? 'Kaldırılıyor…' : 'Bağlantıyı kaldır'}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Feature matrix */}
        <section className="rounded-lg border border-line bg-bg p-6">
          <h3 className="text-sm font-semibold text-ink">Desteklenen Özellikler</h3>
          <ul className="mt-3 flex flex-col gap-2 text-[13px] text-ink">
            <FeatureRow
              icon={MessageSquare}
              title="Hoş geldin DM"
              desc="Yeni çalışana Slack DM + e-posta gönderilir (tenant.user.invited.v1)"
            />
            <FeatureRow
              icon={Shield}
              title="Müdahale DM (KVKK opt-in)"
              desc="Önerilen müdahaleyi onam ekranı linkiyle DM ile iletir (intervention.assigned.v1)"
            />
            <FeatureRow
              icon={Send}
              title="Pulse hatırlatıcı"
              desc="Haftalık pulse anketi kanal veya DM olarak gönderilir (pulse.reminder.v1)"
            />
            <FeatureRow
              icon={MessageSquare}
              title="/upcore-pulse slash komutu"
              desc="Çalışan kendi pulse linkini DM olarak alır."
            />
            <FeatureRow
              icon={MessageSquare}
              title="/upcore-feedback slash komutu"
              desc="Sürekli geri bildirim servisine anonim post gönderir."
            />
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}

interface DefItemProps {
  label: string;
  value?: string | null;
  mono?: boolean;
}

function DefItem({ label, value, mono }: DefItemProps) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-28 shrink-0 text-ink-40">{label}</dt>
      <dd className={`text-ink ${mono ? 'font-mono text-[11px]' : ''}`}>
        {value && value.length > 0 ? value : '—'}
      </dd>
    </div>
  );
}

interface FeatureRowProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

function FeatureRow({ icon: Icon, title, desc }: FeatureRowProps) {
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
