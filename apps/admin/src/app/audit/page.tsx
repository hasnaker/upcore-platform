'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { AlertCircle, Download, Eye, FileSearch, RefreshCw, Search } from 'lucide-react';

interface AuditEvent {
  id: string;
  tenant_id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  event_type: string;
  resource_type?: string | null;
  resource_id?: string | null;
  service?: string | null;
  result?: string | null;
  ip_address?: string | null;
  severity?: 'info' | 'warning' | 'critical';
  created_at: string;
  [key: string]: unknown;
}

interface AuditResponse {
  items: AuditEvent[];
  total?: number;
  next_cursor?: string | null;
}

const SEVERITY_STYLE = {
  info: 'bg-bg-3 text-ink-60',
  warning: 'bg-amber-soft text-amber',
  critical: 'bg-red-soft text-red',
} as const;

const PAGE_SIZE = 50;

// Action/result → severity heuristic (audit service'te severity kolonu olmasa da görsel sınıflandırma)
const inferSeverity = (ev: AuditEvent): 'info' | 'warning' | 'critical' => {
  if (ev.severity) return ev.severity;
  if (ev.result === 'failure' || ev.result === 'error') return 'warning';
  const action = (ev.action || '').toLowerCase();
  if (/(delete|purge|erase|impersonate|suspend)/.test(action)) return 'critical';
  if (/(suspend|disable|reject|lock)/.test(action)) return 'warning';
  return 'info';
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(PAGE_SIZE));
      qs.set('offset', String(page * PAGE_SIZE));
      if (from) qs.set('from', new Date(from).toISOString());
      if (to) qs.set('to', new Date(to).toISOString());

      const res = await fetch(`/api/v1/admin/audit?${qs.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as AuditResponse;
      setEvents(data.items ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const sev = inferSeverity(e);
      if (severity !== 'all' && sev !== severity) return false;
      if (!search.trim()) return true;
      const q = search.toLocaleLowerCase('tr-TR');
      const hay = [
        e.actor_email,
        e.actor_id,
        e.action,
        e.resource_type,
        e.resource_id,
        e.service,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return hay.includes(q);
    });
  }, [events, search, severity]);

  const exportCSV = useCallback(() => {
    const header = [
      'timestamp',
      'actor',
      'tenant_id',
      'action',
      'event_type',
      'resource_type',
      'resource_id',
      'service',
      'result',
      'ip',
      'severity',
    ].join(',');
    const rows = filtered.map((e) => {
      const values = [
        e.created_at,
        e.actor_email ?? e.actor_id ?? 'system',
        e.tenant_id,
        e.action,
        e.event_type,
        e.resource_type ?? '',
        e.resource_id ?? '',
        e.service ?? '',
        e.result ?? '',
        e.ip_address ?? '',
        inferSeverity(e),
      ];
      return values
        .map((v) => {
          const s = String(v ?? '');
          if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Audit Log</h1>
            <p className="mt-1 text-sm text-ink-60">
              Tüm tenant + UpCore staff aksiyonları — immutable, 7 yıl saklama, KVKK uyumlu.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:bg-bg-2 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              CSV indir
            </button>
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
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-red"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-semibold">Audit servisi hata verdi</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Aktör, aksiyon veya kaynak ara…"
              className="h-10 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-sm placeholder:text-ink-40 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-[12px]">
            <label className="text-ink-60">Başlangıç</label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 rounded-md border border-line bg-bg px-2 text-sm"
            />
            <label className="text-ink-60">Bitiş</label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 rounded-md border border-line bg-bg px-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-1 rounded-md border border-line bg-bg p-1 text-[12px]">
            {(['all', 'info', 'warning', 'critical'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`rounded px-3 py-1.5 font-medium transition-colors ${
                  severity === s
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-60 hover:text-ink'
                }`}
              >
                {s === 'all' ? 'Tümü' : s === 'info' ? 'Bilgi' : s === 'warning' ? 'Uyarı' : 'Kritik'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-line bg-bg">
          {loading && events.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-40">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-60">
              Filtreye uyan audit kaydı bulunamadı.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Zaman</th>
                  <th className="px-4 py-3 text-left font-semibold">Aktör</th>
                  <th className="px-4 py-3 text-left font-semibold">Aksiyon</th>
                  <th className="px-4 py-3 text-left font-semibold">Kaynak</th>
                  <th className="px-4 py-3 text-left font-semibold">Servis</th>
                  <th className="px-4 py-3 text-left font-semibold">IP</th>
                  <th className="px-4 py-3 text-left font-semibold">Seviye</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((e) => {
                  const sev = inferSeverity(e);
                  const actor = e.actor_email ?? e.actor_id ?? 'system';
                  return (
                    <tr key={e.id} className="hover:bg-bg-2">
                      <td className="px-4 py-3 font-mono tabular-nums text-[11px] text-ink-40">
                        {formatDate(e.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {actor === 'system' ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-ink-40">
                            <FileSearch className="h-3 w-3" />
                            system
                          </span>
                        ) : (
                          <span className="text-[12px] text-ink-80">{actor}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[11px] text-accent">
                          {e.action}
                        </code>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-40">
                        {e.resource_type ?? '—'}
                        {e.resource_id ? ` · ${e.resource_id.slice(0, 8)}…` : ''}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-40">
                        {e.service ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-40">
                        {e.ip_address ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium uppercase tracking-wider ${SEVERITY_STYLE[sev]}`}
                        >
                          {sev}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-[12px] text-ink-60">
          <div>
            Sayfa {page + 1} · {filtered.length} kayıt gösteriliyor
            {events.length >= PAGE_SIZE && events.length === filtered.length && ' (ek sayfa olabilir)'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="rounded-md border border-line bg-bg px-3 py-1 disabled:opacity-40"
            >
              ← Önceki
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || events.length < PAGE_SIZE}
              className="rounded-md border border-line bg-bg px-3 py-1 disabled:opacity-40"
            >
              Sonraki →
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-accent/20 bg-accent-soft p-3 text-[11px] text-ink-80">
          <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <p>
            <strong>Immutable log:</strong> Audit kayıtları append-only PostgreSQL + Azure Blob
            cold storage. 7 yıl saklama, KVKK + Sayıştay denetim uyumlu.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
