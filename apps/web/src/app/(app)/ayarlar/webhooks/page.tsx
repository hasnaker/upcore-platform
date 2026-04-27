'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, Loader2, Plus, Trash2, Webhook, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type Subscription = {
  id: string;
  name: string;
  target_url: string;
  event_types: string[] | null;
  active: boolean;
  failure_count: number;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  created_at: string;
};

const EVENT_TYPES = [
  'employee.created',
  'employee.updated',
  'employee.terminated',
  'leave.requested',
  'leave.approved',
  'leave.rejected',
  'payroll.slip.generated',
  'assessment.submitted',
  'assessment.risk.high',
  'performance.review.completed',
  'intervention.assigned',
  'intervention.outcome.recorded',
  'offer.sent',
  'offer.accepted',
  'document.signed',
];

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ secret: string; name: string } | null>(null);

  const q = useQuery<{ items: Subscription[] }>({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const r = await fetch('/api/v1/webhooks', { cache: 'no-store' });
      if (!r.ok) return { items: [] };
      return r.json();
    },
  });

  const create = useMutation<
    { id: string; secret: string },
    Error,
    { name: string; target_url: string; event_types: string[] }
  >({
    mutationFn: async (body) => {
      const r = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    onSuccess: (data, vars) => {
      setRevealed({ secret: data.secret, name: vars.name });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: (e) => toast.error(`Oluşturulamadı: ${String(e)}`),
  });

  const remove = useMutation<unknown, Error, string>({
    mutationFn: async (id) => {
      const r = await fetch(`/api/v1/webhooks/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    onSuccess: () => {
      toast.success('Webhook devre dışı bırakıldı');
      qc.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: (e) => toast.error(`Silinemedi: ${String(e)}`),
  });

  const items = q.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ayarlar" className="text-[12px] text-ink-40 hover:underline">← Ayarlar</Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
          <Webhook className="h-5 w-5" />
          Webhook Abonelikleri
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          Event'leri HTTPS endpoint'inize anlık bildirim olarak gönderin. Her istek HMAC-SHA256 ile
          imzalanır (<code className="rounded bg-bg-2 px-1 py-0.5 font-mono text-[11px]">X-Upcore-Signature</code>).
          Başarısız teslimler 6 kez retry edilir; ardından webhook otomatik olarak pasifleşir.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:bg-[#333]"
        >
          <Plus className="h-4 w-4" />
          Yeni Webhook
        </button>
      </div>

      <section className="rounded-xl border border-line bg-bg">
        <div className="border-b border-line p-4 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Kayıtlı Webhook'lar
        </div>
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-60">Henüz webhook kaydı bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-bg-2 text-[10px] uppercase tracking-widest text-ink-40">
                <tr>
                  <th className="p-3 text-left">Ad</th>
                  <th className="p-3 text-left">URL</th>
                  <th className="p-3 text-left">Event'ler</th>
                  <th className="p-3 text-left">Durum</th>
                  <th className="p-3 text-left">Son Teslim</th>
                  <th className="p-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {items.map((w) => (
                  <tr key={w.id} className="border-t border-line">
                    <td className="p-3 font-medium text-ink">{w.name}</td>
                    <td className="p-3 max-w-[220px] truncate font-mono text-[11px] text-ink-60" title={w.target_url}>
                      {w.target_url}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(w.event_types ?? []).slice(0, 3).map((e) => (
                          <span key={e} className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-60">
                            {e}
                          </span>
                        ))}
                        {(w.event_types?.length ?? 0) > 3 && (
                          <span className="text-[10px] text-ink-40">+{(w.event_types?.length ?? 0) - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {w.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-medium text-green">
                          <CheckCircle2 className="h-3 w-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-bg-2 px-2 py-0.5 text-[11px] font-medium text-ink-60">
                          <XCircle className="h-3 w-3" />
                          Pasif
                        </span>
                      )}
                      {w.failure_count > 0 && (
                        <span className="ml-1 inline-flex rounded-full bg-red-soft px-1.5 py-0.5 text-[10px] font-medium text-red">
                          {w.failure_count} hata
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-[11px] text-ink-60">
                      {w.last_success_at
                        ? `✓ ${new Date(w.last_success_at).toLocaleString('tr-TR')}`
                        : w.last_failure_at
                          ? `✗ ${new Date(w.last_failure_at).toLocaleString('tr-TR')}`
                          : '—'}
                    </td>
                    <td className="p-3 text-right">
                      {w.active && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`"${w.name}" webhook'u devre dışı bırakılsın mı?`)) {
                              remove.mutate(w.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-red/30 bg-red-soft px-2 py-1 text-[11px] font-medium text-red hover:bg-red-soft/80"
                        >
                          <Trash2 className="h-3 w-3" />
                          Devre Dışı
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating && (
        <CreateWebhookModal
          onClose={() => setCreating(false)}
          onSubmit={(body) => create.mutate(body)}
          pending={create.isPending}
        />
      )}

      {revealed && (
        <RevealSecretModal
          name={revealed.name}
          secret={revealed.secret}
          onClose={() => setRevealed(null)}
        />
      )}
    </div>
  );
}

function CreateWebhookModal({
  onClose,
  onSubmit,
  pending,
}: {
  onClose: () => void;
  onSubmit: (body: { name: string; target_url: string; event_types: string[] }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);

  const urlValid = /^https:\/\/.+/i.test(url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-line bg-bg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Yeni Webhook</h2>
          <button type="button" onClick={onClose} className="text-ink-40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-ink-40">Ad</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Slack bildirim köprüsü"
              className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-ink-40">Target URL (HTTPS zorunlu)</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://app.example.com/upcore/webhook"
              className={`rounded-md border bg-bg px-3 py-2 font-mono text-[12px] text-ink focus:outline-none ${
                url && !urlValid ? 'border-red focus:border-red' : 'border-line focus:border-accent'
              }`}
            />
            {url && !urlValid && (
              <span className="text-[10px] text-red">URL https:// ile başlamalıdır</span>
            )}
          </label>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-ink-40">
              Event'ler ({events.length})
            </p>
            <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto rounded-md border border-line bg-bg-2 p-2">
              {EVENT_TYPES.map((ev) => (
                <label key={ev} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-bg">
                  <input
                    type="checkbox"
                    checked={events.includes(ev)}
                    onChange={(e) => {
                      setEvents((prev) =>
                        e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev),
                      );
                    }}
                    className="h-3.5 w-3.5 accent-[color:var(--color-accent)]"
                  />
                  <span className="font-mono text-[11px] text-ink">{ev}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:border-ink-20"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={!name || !urlValid || events.length === 0 || pending}
            onClick={() => onSubmit({ name, target_url: url, event_types: events })}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#333] disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

function RevealSecretModal({
  name,
  secret,
  onClose,
}: {
  name: string;
  secret: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-line bg-bg p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-ink">Webhook Oluşturuldu — {name}</h2>
        </div>
        <div className="rounded-md border border-amber/30 bg-amber-soft p-3 text-[12px] text-amber">
          <p className="font-semibold">HMAC secret yalnızca bir kez gösterilir.</p>
          <p className="mt-1 text-ink-80">
            Uç noktanızda gelen imzayı doğrulamak için bu sırrı kullanın:
            <br />
            <code className="font-mono text-[11px]">HMAC-SHA256(secret, raw_body) == X-Upcore-Signature</code>
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-bg-2 p-3">
          <code className="flex-1 break-all font-mono text-[12px] text-ink">{secret}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(secret);
              toast.success('Panoya kopyalandı');
            }}
            className="inline-flex items-center gap-1 rounded-md bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#333]"
          >
            <Copy className="h-3 w-3" />
            Kopyala
          </button>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#0A0A0A] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#333]"
          >
            Kaydettim, Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
