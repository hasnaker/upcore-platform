'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Database, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

type ServiceKey = 'bordro' | 'employee' | 'performance' | 'ats';

const SERVICE_LABELS: Record<ServiceKey, string> = {
  bordro: 'Bordro',
  employee: 'Çalışan',
  performance: 'Performans',
  ats: 'İşe Alım (ATS)',
};

type Stats = {
  pending: number;
  dispatched: number;
  dead_letter: number;
  total: number;
};

type DlqRow = {
  id: string;
  tenant_id: string;
  service_name: string;
  event_type: string;
  aggregate_id?: string;
  dispatched: boolean;
  attempts: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
};

export default function DlqAdminPage() {
  const [service, setService] = useState<ServiceKey>('bordro');
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<DlqRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const LIMIT = 25;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, dlqRes] = await Promise.all([
        fetch(`/api/outbox/${service}?kind=stats`, { cache: 'no-store' }),
        fetch(`/api/outbox/${service}?kind=dlq&page=${page}&limit=${LIMIT}`, {
          cache: 'no-store',
        }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      else setStats(null);
      if (dlqRes.ok) {
        const body = await dlqRes.json();
        setRows(Array.isArray(body.items) ? body.items : []);
        setTotal(Number(body.total) || 0);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch (err) {
      toast.error(`Veri alınamadı: ${String(err)}`);
      setStats(null);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [service, page]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const replay = async (id: string) => {
    setReplayingId(id);
    try {
      const r = await fetch(`/api/outbox/${service}/${id}/replay`, { method: 'POST' });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || body.error || `HTTP ${r.status}`);
      }
      toast.success('Event yeniden kuyruğa alındı');
      void loadAll();
    } catch (err) {
      toast.error(`Replay başarısız: ${String(err)}`);
    } finally {
      setReplayingId(null);
    }
  };

  const maxPage = Math.max(0, Math.ceil(total / LIMIT) - 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Transactional Outbox — Dead Letter Queue
          </h1>
          <p className="mt-1 text-sm text-ink-60">
            Servis Bus'a teslim edilemeyen olaylar. Geçici ağ hatalarında otomatik retry yapılır,
            max_retries aşılırsa buraya düşer. Manuel replay sayacı sıfırlar.
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

      {/* Service selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SERVICE_LABELS) as ServiceKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setService(key);
              setPage(0);
            }}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              service === key
                ? 'bg-accent text-white'
                : 'border border-line bg-bg text-ink-60 hover:border-ink-20'
            }`}
          >
            {SERVICE_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Bekleyen"
          value={stats?.pending ?? '—'}
          tone="amber"
          hint="Kuyrukta, retry penceresi içinde"
        />
        <StatCard
          icon={CheckCircle2}
          label="Teslim Edildi"
          value={stats?.dispatched ?? '—'}
          tone="green"
          hint="Broker'a başarıyla iletildi"
        />
        <StatCard
          icon={AlertTriangle}
          label="Dead Letter"
          value={stats?.dead_letter ?? '—'}
          tone="red"
          hint="max_retries aşıldı"
        />
        <StatCard
          icon={Database}
          label="Toplam"
          value={stats?.total ?? '—'}
          tone="ink"
          hint="Tüm outbox kayıtları"
        />
      </div>

      {/* DLQ table */}
      <section className="rounded-xl border border-line bg-bg">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
            Dead Letter Kuyruğu · {SERVICE_LABELS[service]}
          </h2>
          <span className="text-[11px] text-ink-40">
            {total} kayıt · sayfa {page + 1}/{maxPage + 1}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-green" />
            <p className="text-sm font-medium text-ink">Dead letter yok</p>
            <p className="text-[12px] text-ink-40">
              Tüm event'ler başarıyla teslim ediliyor. Beklenen durum.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-bg-2 text-[10px] uppercase tracking-widest text-ink-40">
                <tr>
                  <th className="p-3 text-left">Event Type</th>
                  <th className="p-3 text-left">Aggregate</th>
                  <th className="p-3 text-left">Denemeler</th>
                  <th className="p-3 text-left">Son Hata</th>
                  <th className="p-3 text-left">Son Deneme</th>
                  <th className="p-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-line align-top">
                    <td className="p-3 font-mono text-[11px] text-ink">{row.event_type}</td>
                    <td className="p-3 font-mono text-[10px] text-ink-60">
                      {row.aggregate_id ? row.aggregate_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full bg-red-soft px-2 py-0.5 font-medium text-red">
                        {row.attempts}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-red">
                      {row.last_error ? row.last_error.slice(0, 80) : '—'}
                      {row.last_error && row.last_error.length > 80 ? '…' : ''}
                    </td>
                    <td className="p-3 text-[11px] text-ink-60">
                      {new Date(row.updated_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => void replay(row.id)}
                        disabled={replayingId === row.id}
                        className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent-soft/80 disabled:opacity-50"
                      >
                        <RotateCcw
                          className={`h-3 w-3 ${replayingId === row.id ? 'animate-spin' : ''}`}
                        />
                        Replay
                      </button>
                    </td>
                  </tr>
                ))}
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

      <div className="rounded-md border border-amber/30 bg-amber-soft p-3 text-[11px] text-amber">
        <p className="font-semibold">Replay nasıl çalışır?</p>
        <p className="mt-1 text-ink-80">
          Replay, <code>attempts</code> alanını sıfırlar ve <code>last_error</code>'u temizler.
          Dispatcher 2 saniyede bir polladığı için event 2-4 sn içinde tekrar gönderilmeye
          çalışılır. Kök sebep (ör. Service Bus arızası, JSON payload hatası) çözülmemişse event
          tekrar DLQ'ya düşer.
        </p>
      </div>
    </div>
  );
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  tone: 'amber' | 'green' | 'red' | 'ink';
  hint: string;
}) => {
  const toneClasses: Record<typeof tone, string> = {
    amber: 'bg-amber-soft text-amber',
    green: 'bg-green-soft text-green',
    red: 'bg-red-soft text-red',
    ink: 'bg-bg-2 text-ink-60',
  };
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-bg p-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${toneClasses[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] uppercase tracking-widest text-ink-40">{label}</p>
      <p className="text-xl font-semibold text-ink">{value}</p>
      <p className="text-[10px] text-ink-40">{hint}</p>
    </div>
  );
};
