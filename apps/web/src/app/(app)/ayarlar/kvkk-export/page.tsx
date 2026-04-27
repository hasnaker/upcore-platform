'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Download, FileArchive, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type Job = {
  id: string;
  scope: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'expired';
  output_blob_url?: string;
  output_size_bytes?: number;
  expires_at?: string;
  completed_at?: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  queued: 'Kuyrukta',
  running: 'İşleniyor',
  completed: 'Hazır',
  failed: 'Başarısız',
  expired: 'Süresi Doldu',
};

const STATUS_TONE: Record<string, string> = {
  queued: 'bg-amber-soft text-amber',
  running: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-soft text-green',
  failed: 'bg-red-soft text-red',
  expired: 'bg-bg-2 text-ink-60',
};

export default function KVKKExportPage() {
  const qc = useQueryClient();
  const q = useQuery<{ items: Job[] }>({
    queryKey: ['kvkk-export-jobs'],
    queryFn: async () => {
      const r = await fetch('/api/v1/admin/export-jobs', { cache: 'no-store' });
      if (!r.ok) return { items: [] };
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const create = useMutation<{ id: string }, Error, { scope: string }>({
    mutationFn: async ({ scope }) => {
      const r = await fetch('/api/v1/admin/export-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    onSuccess: () => {
      toast.success('Export işi kuyruğa alındı. İşlem birkaç dakika sürebilir.');
      qc.invalidateQueries({ queryKey: ['kvkk-export-jobs'] });
    },
    onError: (e) => toast.error(`Oluşturulamadı: ${String(e)}`),
  });

  const items = q.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ayarlar" className="text-[12px] text-ink-40 hover:underline">← Ayarlar</Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
          <FileArchive className="h-5 w-5" />
          KVKK Veri Dışa Aktarma
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          KVKK 11. madde veri taşınabilirlik hakkı kapsamında tenant'ınıza ait tüm verileri zip
          olarak indirin. İşlem arka planda çalışır; indirme bağlantısı 7 gün geçerlidir.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => create.mutate({ scope: 'full' })}
          disabled={create.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Full Export Başlat
        </button>
        <button
          type="button"
          onClick={() => q.refetch()}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:border-ink-20"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${q.isFetching ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      <section className="rounded-xl border border-line bg-bg">
        <div className="border-b border-line p-4 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Son Export İşleri
        </div>
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-60">Hiç export işi bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-bg-2 text-[10px] uppercase tracking-widest text-ink-40">
                <tr>
                  <th className="p-3 text-left">Kapsam</th>
                  <th className="p-3 text-left">Durum</th>
                  <th className="p-3 text-right">Boyut</th>
                  <th className="p-3 text-left">Oluşturuldu</th>
                  <th className="p-3 text-left">Geçerlilik</th>
                  <th className="p-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {items.map((j) => (
                  <tr key={j.id} className="border-t border-line">
                    <td className="p-3 font-mono">{j.scope}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[j.status]}`}>
                        {STATUS_LABEL[j.status] ?? j.status}
                      </span>
                    </td>
                    <td className="p-3 text-right tabular-nums text-ink-60">
                      {j.output_size_bytes ? `${(j.output_size_bytes / (1024 * 1024)).toFixed(2)} MB` : '—'}
                    </td>
                    <td className="p-3 text-[11px] text-ink-60">
                      {new Date(j.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="p-3 text-[11px] text-ink-60">
                      {j.expires_at ? new Date(j.expires_at).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td className="p-3 text-right">
                      {j.status === 'completed' && j.output_blob_url ? (
                        <a
                          href={j.output_blob_url}
                          className="inline-flex items-center gap-1 rounded-md bg-[#0A0A0A] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#333]"
                        >
                          <Download className="h-3 w-3" />
                          İndir
                        </a>
                      ) : (
                        <span className="text-[10px] text-ink-40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-md border border-accent/30 bg-accent-soft p-3 text-[11px] text-accent">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">KVKK Uyumu</p>
          <p className="mt-1 text-ink-80">
            Export edilen dosya AES-256 ile şifrelidir. 7 gün sonrasında otomatik silinir. Her
            export talebi audit_events tablosuna kaydedilir.
          </p>
        </div>
      </div>
    </div>
  );
}
