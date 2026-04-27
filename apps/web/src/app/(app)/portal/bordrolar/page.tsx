'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

type Slip = {
  id: string;
  period_year: number;
  period_month: number;
  total_gross: number;
  total_net: number;
  income_tax: number;
  stamp_tax: number;
  sgk_employee: number;
};

function formatTry(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
}

export default function MySlipsPage() {
  const q = useQuery<{ items: Slip[] }>({
    queryKey: ['portal', 'my-slips'],
    queryFn: async () => {
      const r = await fetch('/api/v1/bordro/me/slips?limit=12', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  });

  const downloadPDF = async (slipId: string, label: string) => {
    try {
      const r = await fetch(`/api/v1/bordro/slips/${slipId}/pdf`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${label}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(`İndirilemedi: ${String(err)}`);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/portal" className="text-[12px] text-ink-40 hover:underline">← Portal</Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-ink">
          <Wallet className="h-5 w-5" />
          Bordrolarım
        </h1>
        <p className="mt-1 text-[13px] text-ink-60">
          Son 12 ayın net maaş, vergi ve SGK kesinti kırılımı. PDF indirme ile kendi kayıtlarına
          ekleyebilirsin.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-bg">
        {q.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-ink-60">
            <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
          </div>
        ) : q.error || !q.data ? (
          <div className="p-8 text-center text-sm text-red">
            Bordrolar yüklenemedi. Yöneticinle görüş.
          </div>
        ) : q.data.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-60">
            Henüz bordron üretilmemiş. İlk bordron ay sonu hesaplanır.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-bg-2 text-[10px] uppercase tracking-widest text-ink-40">
                <tr>
                  <th className="p-3 text-left">Dönem</th>
                  <th className="p-3 text-right">Brüt</th>
                  <th className="p-3 text-right">SGK</th>
                  <th className="p-3 text-right">Gelir V.</th>
                  <th className="p-3 text-right">Damga</th>
                  <th className="p-3 text-right">Net</th>
                  <th className="p-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((s) => {
                  const label = `${s.period_year}-${String(s.period_month).padStart(2, '0')}`;
                  return (
                    <tr key={s.id} className="border-t border-line">
                      <td className="p-3 font-mono text-ink">{label}</td>
                      <td className="p-3 text-right tabular-nums">{formatTry(s.total_gross)}</td>
                      <td className="p-3 text-right tabular-nums text-red">−{formatTry(s.sgk_employee)}</td>
                      <td className="p-3 text-right tabular-nums text-red">−{formatTry(s.income_tax)}</td>
                      <td className="p-3 text-right tabular-nums text-red">−{formatTry(s.stamp_tax)}</td>
                      <td className="p-3 text-right font-medium tabular-nums text-green">
                        {formatTry(s.total_net)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => downloadPDF(s.id, `Bordro_${label}`)}
                          className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-2 py-1 text-[11px] text-ink-60 hover:border-ink-20"
                        >
                          <Download className="h-3 w-3" />
                          İndir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
