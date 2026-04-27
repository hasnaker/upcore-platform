'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Key, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

type APIKey = {
  id: string;
  label: string;
  key_prefix: string;
  scopes: string[] | null;
  rate_limit_per_minute: number;
  last_used_at?: string | null;
  revoked_at?: string | null;
  expires_at?: string | null;
  created_at: string;
};

const SCOPE_OPTIONS = [
  { key: 'employees:read', label: 'Çalışan oku' },
  { key: 'employees:write', label: 'Çalışan yaz' },
  { key: 'leaves:read', label: 'İzin oku' },
  { key: 'leaves:write', label: 'İzin yaz' },
  { key: 'payroll:read', label: 'Bordro oku' },
  { key: 'documents:read', label: 'Belge oku' },
  { key: 'documents:write', label: 'Belge yaz' },
  { key: 'assessments:read', label: 'Değerlendirme oku' },
  { key: 'reports:read', label: 'Rapor oku' },
];

export default function APIKeysPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ key: string; label: string } | null>(null);

  const q = useQuery<{ items: APIKey[] }>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const r = await fetch('/api/v1/api-keys', { cache: 'no-store' });
      if (!r.ok) return { items: [] };
      return r.json();
    },
  });

  const create = useMutation<
    { key: string; item: APIKey },
    Error,
    { label: string; scopes: string[]; rate_limit_per_minute: number }
  >({
    mutationFn: async (body) => {
      const r = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    onSuccess: (data) => {
      setRevealed({ key: data.key, label: data.item.label });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (e) => toast.error(`Oluşturulamadı: ${String(e)}`),
  });

  const revoke = useMutation<unknown, Error, string>({
    mutationFn: async (id) => {
      const r = await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    onSuccess: () => {
      toast.success('Anahtar iptal edildi');
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (e) => toast.error(`İptal edilemedi: ${String(e)}`),
  });

  const items = q.data?.items ?? [];
  const activeItems = items.filter((k) => !k.revoked_at);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ayarlar" className="text-[12px] text-ink-40 hover:underline">← Ayarlar</Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
          <Key className="h-5 w-5" />
          API Anahtarları
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          Public API entegrasyonları için anahtar üretin. Tam anahtar yalnızca oluşturulurken bir
          kez gösterilir — güvenli bir yerde saklayın. Rate limit dakika başıdır.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:bg-[#333]"
        >
          <Plus className="h-4 w-4" />
          Yeni Anahtar
        </button>
        <span className="text-[11px] text-ink-40">
          {activeItems.length} aktif / {items.length} toplam
        </span>
      </div>

      <section className="rounded-xl border border-line bg-bg">
        <div className="border-b border-line p-4 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Anahtarlar
        </div>
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-60">Henüz anahtar oluşturulmamış.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-bg-2 text-[10px] uppercase tracking-widest text-ink-40">
                <tr>
                  <th className="p-3 text-left">Etiket</th>
                  <th className="p-3 text-left">Prefix</th>
                  <th className="p-3 text-left">Scope</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-left">Son Kullanım</th>
                  <th className="p-3 text-left">Durum</th>
                  <th className="p-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {items.map((k) => (
                  <tr key={k.id} className="border-t border-line">
                    <td className="p-3 font-medium text-ink">{k.label}</td>
                    <td className="p-3 font-mono text-[11px] text-ink-60">{k.key_prefix}…</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(k.scopes ?? []).slice(0, 3).map((s) => (
                          <span key={s} className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-60">
                            {s}
                          </span>
                        ))}
                        {(k.scopes?.length ?? 0) > 3 && (
                          <span className="text-[10px] text-ink-40">+{(k.scopes?.length ?? 0) - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums text-ink-60">{k.rate_limit_per_minute}/dk</td>
                    <td className="p-3 text-[11px] text-ink-60">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="p-3">
                      {k.revoked_at ? (
                        <span className="inline-flex items-center rounded-full bg-red-soft px-2 py-0.5 text-[11px] font-medium text-red">
                          İptal
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-medium text-green">
                          Aktif
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {!k.revoked_at && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`"${k.label}" anahtarı iptal edilsin mi? Bu işlem geri alınamaz.`)) {
                              revoke.mutate(k.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-red/30 bg-red-soft px-2 py-1 text-[11px] font-medium text-red hover:bg-red-soft/80"
                        >
                          <Trash2 className="h-3 w-3" />
                          İptal Et
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
        <CreateKeyModal
          onClose={() => setCreating(false)}
          onSubmit={(body) => create.mutate(body)}
          pending={create.isPending}
        />
      )}

      {revealed && (
        <RevealKeyModal
          label={revealed.label}
          fullKey={revealed.key}
          onClose={() => setRevealed(null)}
        />
      )}
    </div>
  );
}

function CreateKeyModal({
  onClose,
  onSubmit,
  pending,
}: {
  onClose: () => void;
  onSubmit: (body: { label: string; scopes: string[]; rate_limit_per_minute: number }) => void;
  pending: boolean;
}) {
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [rate, setRate] = useState(60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-bg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Yeni API Anahtarı</h2>
          <button type="button" onClick={onClose} className="text-ink-40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-ink-40">Etiket</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Örn: Zapier entegrasyonu"
              className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-widest text-ink-40">Rate limit (dakika)</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={rate}
              onChange={(e) => setRate(parseInt(e.target.value) || 60)}
              className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-ink-40">Scope</p>
            <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-md border border-line bg-bg-2 p-2">
              {SCOPE_OPTIONS.map((s) => (
                <label key={s.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-bg">
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.key)}
                    onChange={(e) => {
                      setScopes((prev) =>
                        e.target.checked ? [...prev, s.key] : prev.filter((x) => x !== s.key),
                      );
                    }}
                    className="h-3.5 w-3.5 accent-[color:var(--color-accent)]"
                  />
                  <span className="font-mono text-[11px] text-ink-60">{s.key}</span>
                  <span className="text-[11px] text-ink-40">— {s.label}</span>
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
            disabled={!label || scopes.length === 0 || pending}
            onClick={() => onSubmit({ label, scopes, rate_limit_per_minute: rate })}
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

function RevealKeyModal({
  label,
  fullKey,
  onClose,
}: {
  label: string;
  fullKey: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-line bg-bg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Anahtar Oluşturuldu — {label}</h2>
        </div>
        <div className="rounded-md border border-amber/30 bg-amber-soft p-3 text-[12px] text-amber">
          <p className="font-semibold">Bu anahtar yalnızca bir kez gösterilir.</p>
          <p className="mt-1 text-ink-80">
            Bir parola yöneticisine veya güvenli .env dosyasına kaydedin. Kaybolursa yeni bir
            anahtar üretmeniz gerekir.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-bg-2 p-3">
          <code className="flex-1 break-all font-mono text-[12px] text-ink">{fullKey}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(fullKey);
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
