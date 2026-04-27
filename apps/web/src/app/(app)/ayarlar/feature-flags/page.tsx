'use client';

import Link from 'next/link';
import { Flag, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type FlagRow = {
  flag_key: string;
  enabled: boolean;
  rollout_pct?: number | null;
  description?: string;
  tenant_id?: string | null;
};

export default function FeatureFlagsPage() {
  const qc = useQueryClient();
  const q = useQuery<{ items: FlagRow[] }>({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const r = await fetch('/api/tenant/feature-flags', { cache: 'no-store' });
      if (!r.ok) return { items: [] };
      return r.json();
    },
  });

  const toggle = useMutation<unknown, Error, { flag_key: string; enabled: boolean }>({
    mutationFn: async (payload) => {
      const r = await fetch('/api/tenant/feature-flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature-flags'] }),
    onError: (e) => toast.error(`Güncellenemedi: ${String(e)}`),
  });

  const items = q.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ayarlar" className="text-[12px] text-ink-40 hover:underline">← Ayarlar</Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
          <Flag className="h-5 w-5" />
          Feature Flags
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          Aktif/pasif özellikleri tenant düzeyinde kontrol edin. Kademeli rollout için yüzde
          belirleyebilirsiniz.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-bg">
        <div className="border-b border-line p-4 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Mevcut Özellikler
        </div>
        {q.isLoading ? (
          <div className="p-10 text-center text-sm text-ink-60">Yükleniyor…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-60">
            Henüz tenant-specific override yok. Varsayılanlar global ayarlardan geliyor.
          </div>
        ) : (
          <ul>
            {items.map((f) => (
              <li
                key={f.flag_key}
                className="flex items-center justify-between border-t border-line p-4 first:border-t-0"
              >
                <div>
                  <p className="font-mono text-[12px] text-ink">{f.flag_key}</p>
                  {f.description ? (
                    <p className="mt-0.5 text-[11px] text-ink-60">{f.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {f.rollout_pct != null && f.rollout_pct < 100 ? (
                    <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-medium text-amber">
                      %{f.rollout_pct} rollout
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ flag_key: f.flag_key, enabled: !f.enabled })}
                    className={`inline-flex h-6 w-11 items-center rounded-full px-1 transition-colors ${
                      f.enabled ? 'bg-green' : 'bg-bg-2'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        f.enabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="rounded-md border border-accent/30 bg-accent-soft p-3 text-[11px] text-accent">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Global defaults vs. tenant override</p>
            <p className="mt-1 text-ink-80">
              Plana bağlı özellikler (SSO, ML tahmini) abonelik tier'ına göre otomatik aktifleşir.
              Burada tenant-level override yapabilirsiniz; override global ayarı ezer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
