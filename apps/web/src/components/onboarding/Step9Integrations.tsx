'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveStep } from '@/app/onboarding/actions';
import type { IntegrationsData, OnboardingDraft } from '@/app/onboarding/draft';

interface Step9IntegrationsProps {
  draft: OnboardingDraft | null;
  nextSlug: string | null;
}

export function Step9Integrations({ draft, nextSlug }: Step9IntegrationsProps) {
  const router = useRouter();
  const existing = draft?.data.integrations;
  const [slackEnabled, setSlackEnabled] = useState(existing?.slack_enabled ?? false);
  const [slackUrl, setSlackUrl] = useState(existing?.slack_webhook ?? '');
  const [teamsEnabled, setTeamsEnabled] = useState(existing?.teams_enabled ?? false);
  const [teamsUrl, setTeamsUrl] = useState(existing?.teams_webhook ?? '');
  const [kariyer, setKariyer] = useState(existing?.kariyer_net_url ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const isHttps = (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const onSave = () => {
    setError(null);
    if (slackEnabled && !isHttps(slackUrl)) {
      setError('Slack webhook URL geçersiz (HTTPS olmalı).');
      return;
    }
    if (teamsEnabled && !isHttps(teamsUrl)) {
      setError('Teams webhook URL geçersiz (HTTPS olmalı).');
      return;
    }
    if (kariyer && !isHttps(kariyer)) {
      setError('Kariyer.net XML feed URL geçersiz.');
      return;
    }
    const payload: IntegrationsData = {
      slack_enabled: slackEnabled,
      teams_enabled: teamsEnabled,
      ...(slackEnabled && slackUrl ? { slack_webhook: slackUrl.trim() } : {}),
      ...(teamsEnabled && teamsUrl ? { teams_webhook: teamsUrl.trim() } : {}),
      ...(kariyer ? { kariyer_net_url: kariyer.trim() } : {}),
    };
    start(async () => {
      const res = await saveStep(9, { integrations: payload });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  const skip = () => {
    start(async () => {
      const res = await saveStep(9, {
        integrations: { slack_enabled: false, teams_enabled: false },
      });
      if (!res.ok) {
        setError(res.error ?? 'Kaydedilemedi.');
        return;
      }
      if (nextSlug) router.push(`/onboarding/${nextSlug}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-line bg-bg p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={slackEnabled}
            onChange={(e) => setSlackEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span className="flex-1 text-sm">
            <span className="block font-medium text-ink">Slack bildirimleri</span>
            <span className="block text-xs text-ink-60">
              Tükenmişlik uyarısı, müdahale sonucu ve günlük puls özetlerini Slack kanalınıza iletin.
            </span>
          </span>
        </label>
        {slackEnabled && (
          <input
            value={slackUrl}
            onChange={(e) => setSlackUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/…"
            className="mt-3 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          />
        )}
      </div>

      <div className="rounded-md border border-line bg-bg p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={teamsEnabled}
            onChange={(e) => setTeamsEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span className="flex-1 text-sm">
            <span className="block font-medium text-ink">Microsoft Teams bildirimleri</span>
            <span className="block text-xs text-ink-60">Incoming webhook veya Workflow connector.</span>
          </span>
        </label>
        {teamsEnabled && (
          <input
            value={teamsUrl}
            onChange={(e) => setTeamsUrl(e.target.value)}
            placeholder="https://…logic.azure.com/workflows/…"
            className="mt-3 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          />
        )}
      </div>

      <div className="rounded-md border border-line bg-bg p-4">
        <label className="mb-2 block text-sm font-medium text-ink">Kariyer.net XML feed (opsiyonel)</label>
        <input
          value={kariyer}
          onChange={(e) => setKariyer(e.target.value)}
          placeholder="https://kariyer.net/feeds/sirket.xml"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-60">
          ATS modülü aktifse açık pozisyonları otomatik yayınlayabilirsiniz.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-soft bg-red-soft/40 p-3 text-sm text-red">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-bg hover:bg-accent/90 disabled:opacity-60"
        >
          {isPending ? 'Kaydediliyor…' : 'Kaydet ve devam et'}
        </button>
        <button type="button" onClick={skip} className="text-xs text-ink-60 underline">
          Şimdi atla
        </button>
      </div>
    </div>
  );
}
