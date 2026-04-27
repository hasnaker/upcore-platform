'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  GitBranch,
  Play,
  RefreshCw,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

type Stats = {
  running: number;
  completed: number;
  failed: number;
  compensating: number;
  compensated: number;
  total: number;
};

type InstanceRow = {
  id: string;
  saga_name: string;
  correlation_id?: string;
  aggregate_id?: string;
  current_step: number;
  total_steps: number;
  status: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
};

type StepRecord = {
  id: string;
  step_index: number;
  step_name: string;
  direction: string;
  status: string;
  attempts: number;
  error_message?: string;
  started_at?: string;
  finished_at?: string;
};

const STATUS_META: Record<string, { label: string; tone: string; icon: React.ElementType }> = {
  running: { label: 'Çalışıyor', tone: 'bg-blue-50 text-blue-700 border-blue-200', icon: Play },
  completed: { label: 'Tamamlandı', tone: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  failed: { label: 'Hata', tone: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  compensating: { label: 'Geri Alınıyor', tone: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  compensated: { label: 'Geri Alındı', tone: 'bg-amber-50 text-amber-700 border-amber-200', icon: RotateCcw },
};

export default function SagaAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<InstanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ instance: InstanceRow; steps: StepRecord[] } | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const LIMIT = 25;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ kind: 'list', page: String(page), limit: String(LIMIT) });
      if (statusFilter) qs.set('status', statusFilter);
      const [statsRes, listRes] = await Promise.all([
        fetch('/api/saga?kind=stats', { cache: 'no-store' }),
        fetch(`/api/saga?${qs.toString()}`, { cache: 'no-store' }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (listRes.ok) {
        const body = await listRes.json();
        setItems(Array.isArray(body.items) ? body.items : []);
        setTotal(Number(body.total) || 0);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch (err) {
      toast.error(`Saga veri alınamadı: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void (async () => {
      try {
        const r = await fetch(`/api/saga/${selectedId}`, { cache: 'no-store' });
        if (r.ok) setDetail(await r.json());
      } catch (err) {
        toast.error(`Detay alınamadı: ${String(err)}`);
      }
    })();
  }, [selectedId]);

  const doAction = async (id: string, action: 'retry' | 'cancel') => {
    setActionPending(`${action}:${id}`);
    try {
      const r = await fetch(`/api/saga/${id}/${action}`, { method: 'POST' });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || body.error || `HTTP ${r.status}`);
      }
      toast.success(action === 'retry' ? 'Saga yeniden çalıştırılmak üzere sıfırlandı' : 'Saga iptal edildi');
      void loadAll();
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      toast.error(`İşlem başarısız: ${String(err)}`);
    } finally {
      setActionPending(null);
    }
  };

  const maxPage = Math.max(0, Math.ceil(total / LIMIT) - 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
            <GitBranch className="h-5 w-5" />
            Saga Orchestrator
          </h1>
          <p className="mt-1 text-sm text-ink-60">
            Cross-service iş akışları (örn. offer.accepted → employee.create → onboarding.start).
            Hatalı saga'lar compensation chain ile geri alınır. Retry ile aynı correlation_id
            üzerinden devam edilir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:border-ink-20 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <StatCard label="Çalışıyor" value={stats?.running ?? '—'} tone="blue" icon={Play} />
        <StatCard label="Tamamlandı" value={stats?.completed ?? '—'} tone="green" icon={CheckCircle2} />
        <StatCard label="Hata" value={stats?.failed ?? '—'} tone="red" icon={XCircle} />
        <StatCard label="Geri Alınıyor" value={stats?.compensating ?? '—'} tone="amber" icon={Clock} />
        <StatCard label="Geri Alındı" value={stats?.compensated ?? '—'} tone="amber" icon={RotateCcw} />
        <StatCard label="Toplam" value={stats?.total ?? '—'} tone="ink" icon={GitBranch} />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {['', 'running', 'failed', 'compensated', 'completed'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => {
              setStatusFilter(s);
              setPage(0);
            }}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              statusFilter === s
                ? 'bg-accent text-white'
                : 'border border-line bg-bg text-ink-60 hover:border-ink-20'
            }`}
          >
            {s === '' ? 'Tümü' : STATUS_META[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* List */}
      <section className="rounded-xl border border-line bg-bg">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
            Saga Instance'ları
          </h2>
          <span className="text-[11px] text-ink-40">
            {total} kayıt · sayfa {page + 1}/{maxPage + 1}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-green" />
            <p className="text-sm font-medium text-ink">Saga kaydı yok</p>
            <p className="text-[12px] text-ink-40">
              Henüz hiçbir cross-service iş akışı başlatılmadı.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-bg-2 text-[10px] uppercase tracking-widest text-ink-40">
                <tr>
                  <th className="p-3 text-left">Saga</th>
                  <th className="p-3 text-left">Durum</th>
                  <th className="p-3 text-left">İlerleme</th>
                  <th className="p-3 text-left">Son Güncel.</th>
                  <th className="p-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const fallback: (typeof STATUS_META)[string] = {
                    label: row.status,
                    tone: 'bg-bg-2 text-ink-60 border-line',
                    icon: XCircle,
                  };
                  const meta = STATUS_META[row.status] ?? fallback;
                  const Icon = meta.icon;
                  const canRetry = row.status === 'failed' || row.status === 'compensated';
                  const canCancel = row.status === 'running' || row.status === 'compensating';
                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-line align-top hover:bg-bg-2 ${
                        selectedId === row.id ? 'bg-accent-soft' : ''
                      }`}
                    >
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setSelectedId(row.id)}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-ink hover:underline"
                        >
                          {row.saga_name}
                          <ChevronRight className="h-3 w-3 text-ink-40" />
                        </button>
                        {row.correlation_id ? (
                          <p className="mt-0.5 font-mono text-[10px] text-ink-40">
                            {row.correlation_id}
                          </p>
                        ) : null}
                        {row.last_error ? (
                          <p className="mt-1 text-[10px] text-red">
                            {row.last_error.slice(0, 80)}
                            {row.last_error.length > 80 ? '…' : ''}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-ink-60">
                        {row.current_step}/{row.total_steps}
                        <div className="mt-1 h-1 w-20 rounded bg-bg-2">
                          <div
                            className="h-1 rounded bg-accent"
                            style={{ width: `${(row.current_step / row.total_steps) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3 text-[11px] text-ink-60">
                        {new Date(row.updated_at).toLocaleString('tr-TR')}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          {canRetry ? (
                            <button
                              type="button"
                              onClick={() => void doAction(row.id, 'retry')}
                              disabled={actionPending === `retry:${row.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-soft/80 disabled:opacity-50"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Yeniden Dene
                            </button>
                          ) : null}
                          {canCancel ? (
                            <button
                              type="button"
                              onClick={() => void doAction(row.id, 'cancel')}
                              disabled={actionPending === `cancel:${row.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-red/30 bg-red-soft px-2 py-1 text-[11px] font-medium text-red hover:bg-red-soft/80 disabled:opacity-50"
                            >
                              <XCircle className="h-3 w-3" />
                              İptal
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {maxPage > 0 && (
          <div className="flex items-center justify-between border-t border-line p-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border border-line px-3 py-1 text-[11px] font-medium text-ink-60 hover:border-ink-20 disabled:opacity-50"
            >
              Önceki
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={page >= maxPage}
              className="rounded-md border border-line px-3 py-1 text-[11px] font-medium text-ink-60 hover:border-ink-20 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
      </section>

      {/* Detail panel */}
      {selectedId && detail ? (
        <section className="rounded-xl border border-line bg-bg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
              Adım Detayları · {detail.instance.saga_name}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-md p-1 text-ink-40 hover:bg-bg-2 hover:text-ink"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
          <ol className="mt-3 space-y-2">
            {detail.steps.map((step) => (
              <li
                key={step.id}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  step.status === 'failed'
                    ? 'border-red/30 bg-red-soft'
                    : step.status === 'success'
                      ? 'border-green/30 bg-green-soft'
                      : 'border-line bg-bg-2'
                }`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-ink">
                  {step.step_index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-ink">
                    {step.step_name}
                    <span className="ml-2 text-[10px] font-normal text-ink-40">
                      {step.direction === 'execute' ? 'Yürüt' : 'Geri Al'}
                    </span>
                  </p>
                  {step.error_message ? (
                    <p className="mt-1 text-[11px] text-red">{step.error_message}</p>
                  ) : null}
                  {step.finished_at ? (
                    <p className="mt-1 text-[10px] text-ink-40">
                      Bitti: {new Date(step.finished_at).toLocaleString('tr-TR')}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium ${
                    step.status === 'failed'
                      ? 'bg-red text-white'
                      : step.status === 'success'
                        ? 'bg-green text-white'
                        : 'bg-bg-2 text-ink-60'
                  }`}
                >
                  {step.status}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="rounded-md border border-amber/30 bg-amber-soft p-3 text-[11px] text-amber">
        <p className="font-semibold">Saga pattern nasıl çalışır?</p>
        <p className="mt-1 text-ink-80">
          Her saga sıralı adımlar çalıştırır. Hata olursa ters yönde <code>Compensate()</code> çağrılır
          (örn. employee delete, offer revoke). <strong>Retry</strong>: failed/compensated state'i
          sıfırlar, orchestrator bir sonraki Start() çağrısında aynı correlation_id üzerinden
          kaldığı yerden devam eder.
        </p>
      </div>
    </div>
  );
}

const StatCard = ({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone: 'blue' | 'green' | 'red' | 'amber' | 'ink';
  icon: React.ElementType;
}) => {
  const toneClasses: Record<typeof tone, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-soft text-green',
    red: 'bg-red-soft text-red',
    amber: 'bg-amber-soft text-amber',
    ink: 'bg-bg-2 text-ink-60',
  };
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-bg p-4">
      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${toneClasses[tone]}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-[10px] uppercase tracking-widest text-ink-40">{label}</p>
      <p className="text-lg font-semibold text-ink">{value}</p>
    </div>
  );
};

// Prevent unused import warning on AlertTriangle.
void AlertTriangle;
