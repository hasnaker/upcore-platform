'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Award, Download, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

type Certificate = {
  id: string;
  certificateNo: string;
  issuedAt: string;
  validUntil?: string | null;
  score: number | null;
  blobUrl?: string | null;
  revoked: boolean;
  revokedReason?: string | null;
  programName: string;
  programCode: string;
  employeeName: string;
};

export default function CertificatesPage() {
  const qc = useQueryClient();
  const [revoking, setRevoking] = useState<Certificate | null>(null);

  const q = useQuery<{ items: Certificate[] }>({
    queryKey: ['training-certificates'],
    queryFn: async () => {
      const r = await fetch('/api/training/certificates', { cache: 'no-store' });
      if (!r.ok) return { items: [] };
      return r.json();
    },
  });

  const revoke = useMutation<unknown, Error, { certificate_id: string; revoked_reason: string }>({
    mutationFn: async (body) => {
      const r = await fetch('/api/training/certificates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    onSuccess: () => {
      toast.success('Sertifika iptal edildi');
      setRevoking(null);
      qc.invalidateQueries({ queryKey: ['training-certificates'] });
    },
    onError: (e) => toast.error(`İptal başarısız: ${String(e)}`),
  });

  const items = q.data?.items ?? [];
  const active = items.filter((c) => !c.revoked);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/egitim" className="text-[12px] text-ink-40 hover:underline">← Eğitim & Gelişim</Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
          <Award className="h-5 w-5" />
          Eğitim Sertifikaları
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          Tamamlanan eğitimlerden verilen sertifikaların listesi. Her sertifika tenant'a özel seri
          numarasıyla tutulur (UPC-CERT-YYYY-NNNNN). Geçerlilik süresi dolan sertifikalar otomatik
          geçersiz sayılır; gerektiğinde iptal edilebilir.
        </p>
        <p className="mt-1 text-[11px] text-ink-40">
          {active.length} aktif · {items.length - active.length} iptal · {items.length} toplam
        </p>
      </div>

      <section className="rounded-xl border border-line bg-bg">
        <div className="border-b border-line p-4 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Verilen Sertifikalar
        </div>
        {q.isLoading ? (
          <div className="p-10 text-center text-sm text-ink-60">Yükleniyor…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-60">
            Henüz sertifika verilmemiş. Tamamlanmış enrollment'lar için /egitim sayfasından sertifika üretebilirsiniz.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-bg-2 text-[10px] uppercase tracking-widest text-ink-40">
                <tr>
                  <th className="p-3 text-left">Sertifika No</th>
                  <th className="p-3 text-left">Çalışan</th>
                  <th className="p-3 text-left">Program</th>
                  <th className="p-3 text-right">Skor</th>
                  <th className="p-3 text-left">Veriliş</th>
                  <th className="p-3 text-left">Geçerlilik</th>
                  <th className="p-3 text-left">Durum</th>
                  <th className="p-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="p-3 font-mono text-[11px]">{c.certificateNo}</td>
                    <td className="p-3 font-medium text-ink">{c.employeeName}</td>
                    <td className="p-3 text-ink-60">
                      <div>{c.programName}</div>
                      <div className="font-mono text-[10px] text-ink-40">{c.programCode}</div>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {c.score !== null ? `${c.score}` : '—'}
                    </td>
                    <td className="p-3 text-[11px] text-ink-60">
                      {new Date(c.issuedAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="p-3 text-[11px] text-ink-60">
                      {c.validUntil ? new Date(c.validUntil).toLocaleDateString('tr-TR') : 'Süresiz'}
                    </td>
                    <td className="p-3">
                      {c.revoked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-soft px-2 py-0.5 text-[11px] font-medium text-red">
                          <XCircle className="h-3 w-3" />
                          İptal
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-medium text-green">
                          Geçerli
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        {c.blobUrl && (
                          <a
                            href={c.blobUrl}
                            className="inline-flex items-center gap-1 rounded-md bg-[#0A0A0A] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#333]"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </a>
                        )}
                        {!c.revoked && (
                          <button
                            type="button"
                            onClick={() => setRevoking(c)}
                            className="inline-flex items-center gap-1 rounded-md border border-red/30 bg-red-soft px-2 py-1 text-[11px] font-medium text-red hover:bg-red-soft/80"
                          >
                            <XCircle className="h-3 w-3" />
                            İptal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {revoking && (
        <RevokeModal
          cert={revoking}
          onClose={() => setRevoking(null)}
          onSubmit={(reason) =>
            revoke.mutate({ certificate_id: revoking.id, revoked_reason: reason })
          }
          pending={revoke.isPending}
        />
      )}
    </div>
  );
}

function RevokeModal({
  cert,
  onClose,
  onSubmit,
  pending,
}: {
  cert: Certificate;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  pending: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-bg p-6">
        <h2 className="text-base font-semibold text-ink">Sertifikayı İptal Et</h2>
        <p className="mt-2 text-[12px] text-ink-60">
          <span className="font-mono">{cert.certificateNo}</span> — {cert.employeeName}
        </p>
        <label className="mt-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-widest text-ink-40">
            İptal gerekçesi (audit loguna yazılır)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Örn: sertifika süresi yönetmelik değişikliği nedeniyle erken sonlandırıldı"
            className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>
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
            disabled={reason.length < 10 || pending}
            onClick={() => onSubmit(reason)}
            className="inline-flex items-center gap-1.5 rounded-md bg-red px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red/90 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            İptal Et
          </button>
        </div>
      </div>
    </div>
  );
}
