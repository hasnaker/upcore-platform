'use client';

import { useState, useCallback, useEffect } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { AlertCircle, Flag, RefreshCw } from 'lucide-react';

interface FeatureFlag {
  flag_key: string;
  enabled: boolean;
  rollout_pct?: number | null;
  description?: string | null;
}

interface FlagsResponse {
  items: FeatureFlag[];
}

interface ApiError {
  error: string;
  message?: string;
}

const STATIC_DESCRIPTIONS: Record<string, string> = {
  ai_rationale: 'Action Center LLM gerekçeleri',
  burnout_prediction: 'Burnout LSTM prediction — 100+ çalışan tenant',
  linkedin_feed: 'LinkedIn Jobs Feed (partner API)',
  sap_sync: 'SAP HR Master Sync (çift yönlü)',
  new_dashboard: 'V2 Dashboard UI canary rollout',
};

export default function FlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/flags', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as FlagsResponse;
      setFlags(data.items ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateFlag = useCallback(
    async (flag: FeatureFlag, patch: Partial<FeatureFlag>) => {
      const updated = { ...flag, ...patch };
      setSavingKey(flag.flag_key);
      setError(null);
      try {
        const res = await fetch('/api/v1/admin/flags', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flag_key: updated.flag_key,
            enabled: updated.enabled,
            rollout_pct: updated.rollout_pct ?? null,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as ApiError;
          throw new Error(data.message ?? `HTTP ${res.status}`);
        }
        setFlags((prev) => prev.map((f) => (f.flag_key === flag.flag_key ? updated : f)));
        setSavedToast(`${flag.flag_key} kaydedildi`);
        window.setTimeout(() => setSavedToast(null), 2500);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSavingKey(null);
      }
    },
    [],
  );

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Feature Flags</h1>
            <p className="mt-1 text-sm text-ink-60">
              Global ve tenant-bazlı özellik açma/kapama. Canary rollout, A/B test yönetimi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:bg-bg-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>

        {savedToast && (
          <div
            role="status"
            className="rounded-md border border-green/30 bg-green-soft p-2 text-[12px] text-green"
          >
            {savedToast}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-red"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-semibold">Feature flag servisi hata verdi</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {loading && flags.length === 0 ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-lg border border-line bg-bg-2"
              />
            ))}
          </div>
        ) : flags.length === 0 ? (
          <div className="rounded-lg border border-line bg-bg p-8 text-center text-sm text-ink-60">
            Bu tenant için tanımlı feature flag yok.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {flags.map((f) => {
              const description = f.description ?? STATIC_DESCRIPTIONS[f.flag_key] ?? '';
              const busy = savingKey === f.flag_key;
              return (
                <div
                  key={f.flag_key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-bg p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft">
                      <Flag className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{f.flag_key}</h3>
                      {description && (
                        <p className="mt-0.5 text-[12px] text-ink-60">{description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-[11px]">
                        <code className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-ink-60">
                          {f.flag_key}
                        </code>
                        {f.rollout_pct !== null && f.rollout_pct !== undefined && (
                          <span className="text-ink-40">Rollout %{f.rollout_pct}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Rollout slider */}
                    <div className="flex flex-col items-end gap-1">
                      <label
                        htmlFor={`rollout-${f.flag_key}`}
                        className="text-[10px] uppercase tracking-wider text-ink-40"
                      >
                        Rollout %
                      </label>
                      <input
                        id={`rollout-${f.flag_key}`}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        disabled={busy}
                        value={f.rollout_pct ?? 100}
                        onChange={(e) =>
                          setFlags((prev) =>
                            prev.map((x) =>
                              x.flag_key === f.flag_key
                                ? { ...x, rollout_pct: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                        onMouseUp={(e) =>
                          void updateFlag(f, { rollout_pct: Number((e.target as HTMLInputElement).value) })
                        }
                        className="w-28"
                      />
                      <span className="text-[11px] tabular-nums text-ink-60">
                        {f.rollout_pct ?? 100}%
                      </span>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2">
                      <span className="text-[11px] text-ink-40">
                        {f.enabled ? 'Aktif' : 'Kapalı'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={f.enabled}
                        disabled={busy}
                        onClick={() => void updateFlag(f, { enabled: !f.enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                          f.enabled ? 'bg-accent' : 'bg-ink-20'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            f.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md border border-accent/20 bg-accent-soft p-3 text-[11px] text-ink-80">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <p>
            <strong>Backend:</strong>{' '}
            <code className="rounded bg-bg-2 px-1">services/tenant</code> · PostgreSQL
            <code className="rounded bg-bg-2 px-1 ml-1">app.feature_flags</code> ·
            Tenant override + global default · Upsert işlemi audit log&apos;a yazılır.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
