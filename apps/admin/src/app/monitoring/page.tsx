'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Activity, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface DailyHistory {
  day: string;
  total_probes: number;
  failed_probes: number;
  p95_latency_ms?: number | null;
  incident_count?: number;
}

interface Component {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  sort_order?: number;
  status: string;
  healthcheck_url?: string | null;
  prometheus_job?: string | null;
  auto_sync_enabled?: boolean;
  last_checked_at?: string | null;
  history?: DailyHistory[];
}

interface ComponentsResponse {
  components: Component[];
}

type StatusKey = 'healthy' | 'degraded' | 'down' | 'unknown';

const STATUS_STYLE: Record<StatusKey, { bg: string; text: string; label: string; dot: string }> = {
  healthy: { bg: 'bg-green-soft', text: 'text-green', label: 'Sağlıklı', dot: 'bg-green' },
  degraded: { bg: 'bg-amber-soft', text: 'text-amber', label: 'Yavaş', dot: 'bg-amber' },
  down: { bg: 'bg-red-soft', text: 'text-red', label: 'Erişilemiyor', dot: 'bg-red' },
  unknown: { bg: 'bg-bg-3', text: 'text-ink-60', label: 'Bilinmiyor', dot: 'bg-ink-20' },
};

const POLL_INTERVAL_MS = 30_000; // 30s polling (5s çok agresif; 30s production-safe)

const normalizeStatus = (s: string): StatusKey => {
  const v = (s || '').toLowerCase();
  if (v === 'operational' || v === 'healthy' || v === 'ok') return 'healthy';
  if (v === 'degraded_performance' || v === 'partial_outage' || v === 'degraded') return 'degraded';
  if (v === 'major_outage' || v === 'down' || v === 'unhealthy') return 'down';
  return 'unknown';
};

const computeUptime = (history: DailyHistory[] | undefined): number | null => {
  if (!history || history.length === 0) return null;
  const total = history.reduce((acc, h) => acc + (h.total_probes ?? 0), 0);
  if (total === 0) return null;
  const failed = history.reduce((acc, h) => acc + (h.failed_probes ?? 0), 0);
  return ((total - failed) / total) * 100;
};

const computeAvgLatency = (history: DailyHistory[] | undefined): number | null => {
  if (!history || history.length === 0) return null;
  const vals = history.map((h) => h.p95_latency_ms).filter((v): v is number => typeof v === 'number' && v > 0);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
};

const computeErrorRate = (history: DailyHistory[] | undefined): number | null => {
  if (!history || history.length === 0) return null;
  const total = history.reduce((acc, h) => acc + (h.total_probes ?? 0), 0);
  if (total === 0) return null;
  const failed = history.reduce((acc, h) => acc + (h.failed_probes ?? 0), 0);
  return (failed / total) * 100;
};

export default function MonitoringPage() {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/monitoring', { method: 'GET', cache: 'no-store' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ComponentsResponse;
      setComponents(data.components ?? []);
      setLastFetch(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const aggregated = useMemo(() => {
    const healthy = components.filter((c) => normalizeStatus(c.status) === 'healthy').length;
    const total = components.length;

    const uptimes = components
      .map((c) => computeUptime(c.history))
      .filter((v): v is number => v !== null);
    const avgUptime = uptimes.length > 0 ? uptimes.reduce((a, b) => a + b, 0) / uptimes.length : null;

    const latencies = components
      .map((c) => computeAvgLatency(c.history))
      .filter((v): v is number => v !== null);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;

    const errorRates = components
      .map((c) => computeErrorRate(c.history))
      .filter((v): v is number => v !== null);
    const avgErrorRate =
      errorRates.length > 0 ? errorRates.reduce((a, b) => a + b, 0) / errorRates.length : null;

    return { healthy, total, avgUptime, avgLatency, avgErrorRate };
  }, [components]);

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Monitoring</h1>
            <p className="mt-1 text-sm text-ink-60">
              Tüm servislerin canlı sağlığı · uptime, p95 latency, error rate — status servisi agregasyonu.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-green-soft px-3 py-1.5 text-[12px] font-semibold text-green">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {aggregated.healthy}/{aggregated.total} sağlıklı
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:bg-bg-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-red"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-semibold">Status servisi hata verdi</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Uptime (90d avg)"
            value={aggregated.avgUptime !== null ? `${aggregated.avgUptime.toFixed(2)}%` : '—'}
            tone="green"
          />
          <StatCard
            label="Ort. p95 Latency"
            value={aggregated.avgLatency !== null ? `${aggregated.avgLatency}ms` : '—'}
            tone="accent"
          />
          <StatCard
            label="Ort. Error Rate"
            value={aggregated.avgErrorRate !== null ? `%${aggregated.avgErrorRate.toFixed(2)}` : '—'}
            tone={aggregated.avgErrorRate !== null && aggregated.avgErrorRate > 1 ? 'amber' : 'green'}
          />
          <StatCard
            label="Servis Sayısı"
            value={String(aggregated.total)}
            tone="accent"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-bg">
          {loading && components.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-40">Yükleniyor…</div>
          ) : components.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-60">Takip edilen servis bulunamadı.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Servis</th>
                  <th className="px-4 py-3 text-left font-semibold">Kategori</th>
                  <th className="px-4 py-3 text-left font-semibold">Durum</th>
                  <th className="px-4 py-3 text-right font-semibold">Uptime</th>
                  <th className="px-4 py-3 text-right font-semibold">p95 Latency</th>
                  <th className="px-4 py-3 text-right font-semibold">Hata Oranı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {components.map((c) => {
                  const style = STATUS_STYLE[normalizeStatus(c.status)];
                  const uptime = computeUptime(c.history);
                  const latency = computeAvgLatency(c.history);
                  const errorRate = computeErrorRate(c.history);
                  return (
                    <tr key={c.id} className="hover:bg-bg-2">
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm font-medium text-ink">{c.name}</p>
                        {c.description && <p className="text-[11px] text-ink-40">{c.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex h-5 items-center rounded bg-bg-3 px-1.5 text-[10px] font-semibold uppercase text-ink-60">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-60">
                        {uptime !== null ? `${uptime.toFixed(2)}%` : '—'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          latency !== null && latency > 150 ? 'font-semibold text-amber' : 'text-ink-60'
                        }`}
                      >
                        {latency !== null ? `${latency}ms` : '—'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          errorRate !== null && errorRate > 1 ? 'font-semibold text-amber' : 'text-ink-60'
                        }`}
                      >
                        {errorRate !== null ? `%${errorRate.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-ink-40">
          <span>
            {lastFetch
              ? `Son güncelleme: ${lastFetch.toLocaleTimeString('tr-TR')}`
              : 'Henüz çekilmedi'}
          </span>
          <span>Poll aralığı: {POLL_INTERVAL_MS / 1000}s</span>
        </div>
      </div>
    </AdminShell>
  );
}

const StatCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'amber' | 'accent';
}) => {
  const toneClass = { green: 'text-green', amber: 'text-amber', accent: 'text-accent' }[tone];
  return (
    <div className="rounded-lg border border-line bg-bg p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-40">
        <Activity className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
};
