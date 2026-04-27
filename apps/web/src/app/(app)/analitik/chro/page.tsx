'use client';

import { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Grid3x3,
  ArrowRightLeft,
  Map,
  DollarSign,
  Download,
  FileText,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

/* ────────────────────────────────────────────────────────────────────────────
 * /analitik/chro — CHRO Executive Dashboard
 *  - Tükenmişlik aylık trend
 *  - 9-kutu dağılım + bias
 *  - İç vs dış işe alım oranı
 *  - Kariyer hareketi heatmap
 *  - ROI hesap: Koruma modülü Cohen's d × çalışan sayısı × ortalama maaş
 *  - Export: PDF + PPTX
 * ──────────────────────────────────────────────────────────────────────────*/

interface BurnoutTrend {
  month: string;
  avg_bat: number;
  at_risk_count: number;
  total_employees: number;
}

interface NineBoxCell {
  row: 1 | 2 | 3; // performance
  col: 1 | 2 | 3; // potential
  count: number;
  bias_flag?: 'gender' | 'age' | 'tenure';
}

interface HiringMix {
  month: string;
  internal: number;
  external: number;
}

interface CareerMove {
  from_dept: string;
  to_dept: string;
  count: number;
}

interface InterventionROI {
  intervention_code: string;
  intervention_title: string;
  cohens_d: number;
  employee_count: number;
  avg_salary_monthly: number;
  annual_turnover_saved: number;
  annual_productivity_gain: number;
  total_roi_try: number;
}

interface ChroDashboard {
  period: string;
  burnout_trend: BurnoutTrend[];
  nine_box: NineBoxCell[];
  hiring_mix: HiringMix[];
  career_moves: CareerMove[];
  roi: InterventionROI[];
  total_roi_try: number;
}

export default function ChroDashboardPage() {
  const [period, setPeriod] = useState<'12m' | '6m' | '3m'>('12m');

  const { data, isLoading } = useQuery<ChroDashboard>({
    queryKey: ['chro-dashboard', period],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analytics/chro?period=${period}`);
      if (!res.ok) throw new Error('CHRO dashboard alınamadı');
      return res.json();
    },
  });

  const exportPDF = async () => {
    const res = await fetch(`/api/v1/analytics/chro/export?format=pdf&period=${period}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upcore-chro-${period}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPPTX = async () => {
    const res = await fetch(`/api/v1/analytics/chro/export?format=pptx&period=${period}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upcore-chro-${period}.pptx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-end justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5E5CE6]">
            CHRO Executive
          </span>
          <h1 className="mt-1 text-2xl font-semibold text-[#0A0A0A]">Yönetici Karnesi</h1>
          <p className="mt-1 text-sm text-[#525252]">
            5 kritik metrik · aylık trend · bias denetimi · ROI hesabı.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-[#EDEDED] bg-white p-1">
            {(['3m', '6m', '12m'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-sm px-3 py-1 text-[12px] font-medium ${
                  period === p ? 'bg-[#0A0A0A] text-white' : 'text-[#525252]'
                }`}
              >
                {p === '3m' ? 'Son 3 ay' : p === '6m' ? 'Son 6 ay' : 'Son 12 ay'}
              </button>
            ))}
          </div>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 rounded-md border border-[#EDEDED] bg-white px-3 py-1.5 text-[12px] font-medium text-[#525252] hover:border-[#0A0A0A]"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            onClick={exportPPTX}
            className="inline-flex items-center gap-2 rounded-md border border-[#EDEDED] bg-white px-3 py-1.5 text-[12px] font-medium text-[#525252] hover:border-[#0A0A0A]"
          >
            <Download className="h-3.5 w-3.5" />
            PPTX
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg border border-[#EDEDED] bg-white" />
          ))}
        </div>
      ) : (
        data && (
          <div className="grid gap-6 lg:grid-cols-2">
            <BurnoutTrendCard data={data.burnout_trend} />
            <NineBoxCard data={data.nine_box} />
            <HiringMixCard data={data.hiring_mix} />
            <CareerHeatmapCard data={data.career_moves} />
            <RoiCard roi={data.roi} total={data.total_roi_try} />
          </div>
        )
      )}
    </div>
  );
}

const Card = ({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string;
  icon: typeof TrendingDown;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`rounded-lg border border-[#EDEDED] bg-white p-5 ${className}`}>
    <header className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#5E5CE6]" />
      <h2 className="text-sm font-semibold text-[#0A0A0A]">{title}</h2>
    </header>
    {children}
  </section>
);

const BurnoutTrendCard = ({ data }: { data: BurnoutTrend[] }) => {
  const max = Math.max(...data.map((d) => d.avg_bat), 1);
  const latest = data.at(-1);
  const prev = data.at(-2);
  const delta = latest && prev ? latest.avg_bat - prev.avg_bat : 0;

  return (
    <Card title="Tükenmişlik Trendi (BAT-TR)" icon={TrendingDown}>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="text-3xl font-semibold text-[#0A0A0A]">
          {latest?.avg_bat.toFixed(2) ?? '—'}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[12px] font-medium ${
            delta > 0 ? 'text-[#B91C1C]' : 'text-[#059669]'
          }`}
        >
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta.toFixed(2)} aylık değişim
        </span>
      </div>
      <div className="flex items-end gap-1 overflow-x-auto">
        {data.map((d) => (
          <div key={d.month} className="flex w-full flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-gradient-to-t from-[#B91C1C] to-[#F87171]"
              style={{ height: `${(d.avg_bat / max) * 100}px` }}
              title={`${d.avg_bat.toFixed(2)} · ${d.at_risk_count} risk`}
            />
            <span className="text-[10px] text-[#A3A3A3]">{d.month.slice(5)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const NineBoxCard = ({ data }: { data: NineBoxCell[] }) => {
  const cell = (row: number, col: number) =>
    data.find((c) => c.row === row && c.col === col) ?? { row, col, count: 0 };
  const hasBias = data.some((c) => c.bias_flag);

  return (
    <Card title="9-Kutu Dağılımı" icon={Grid3x3}>
      {hasBias && (
        <div className="mb-3 rounded-md bg-[#FEF3C7] px-3 py-2 text-[11px] text-[#B45309]">
          Bias tespit edildi: belirli kategorilerde dağılım beklenenin dışında.
        </div>
      )}
      <div className="grid grid-cols-3 gap-1">
        {[3, 2, 1].map((row) =>
          [1, 2, 3].map((col) => {
            const c = cell(row, col);
            const intensity = Math.min(c.count / 10, 1);
            return (
              <div
                key={`${row}-${col}`}
                className="relative flex aspect-square items-center justify-center rounded text-sm font-semibold text-[#0A0A0A]"
                style={{ backgroundColor: `rgba(94, 92, 230, ${0.08 + intensity * 0.5})` }}
              >
                {c.count}
                {'bias_flag' in c && c.bias_flag && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                )}
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-[#A3A3A3]">
        <span>Düşük potansiyel</span>
        <span>Yüksek potansiyel →</span>
      </div>
    </Card>
  );
};

const HiringMixCard = ({ data }: { data: HiringMix[] }) => {
  const total = data.reduce((s, d) => s + d.internal + d.external, 0);
  const internal = data.reduce((s, d) => s + d.internal, 0);
  const ratio = total ? (internal / total) * 100 : 0;

  return (
    <Card title="İç vs Dış İşe Alım" icon={ArrowRightLeft}>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="text-3xl font-semibold text-[#0A0A0A]">%{ratio.toFixed(0)}</span>
        <span className="text-[12px] text-[#A3A3A3]">iç mobilite</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-[#F5F5F5]">
        <div className="h-full bg-[#059669]" style={{ width: `${ratio}%` }} />
        <div className="h-full bg-[#5E5CE6]" style={{ width: `${100 - ratio}%` }} />
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-[#525252]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#059669]" /> İç ({internal})
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#5E5CE6]" /> Dış ({total - internal})
        </span>
      </div>
    </Card>
  );
};

const CareerHeatmapCard = ({ data }: { data: CareerMove[] }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <Card title="Kariyer Hareketi Heatmap" icon={Map}>
      <div className="flex flex-col gap-1 text-[11px]">
        {data.slice(0, 8).map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-28 truncate text-[#525252]">{m.from_dept}</span>
            <span className="text-[#A3A3A3]">→</span>
            <span className="w-28 truncate text-[#525252]">{m.to_dept}</span>
            <div className="flex-1">
              <div
                className="h-3 rounded"
                style={{
                  width: `${(m.count / max) * 100}%`,
                  backgroundColor: '#5E5CE6',
                  opacity: 0.3 + (m.count / max) * 0.7,
                }}
              />
            </div>
            <span className="w-6 text-right font-medium text-[#0A0A0A]">{m.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const RoiCard = ({ roi, total }: { roi: InterventionROI[]; total: number }) => (
  <Card title="Koruma Modülü ROI" icon={DollarSign} className="lg:col-span-2">
    <div className="mb-4 flex items-baseline gap-3">
      <span className="text-3xl font-semibold text-[#0A0A0A]">
        {total.toLocaleString('tr-TR', {
          style: 'currency',
          currency: 'TRY',
          maximumFractionDigits: 0,
        })}
      </span>
      <span className="text-[12px] text-[#A3A3A3]">yıllık tahmini ROI</span>
    </div>
    <table className="w-full text-[12px]">
      <thead className="border-b border-[#EDEDED] text-[10px] uppercase tracking-wider text-[#A3A3A3]">
        <tr>
          <th className="pb-2 text-left">Müdahale</th>
          <th className="pb-2 text-right">Cohen&apos;s d</th>
          <th className="pb-2 text-right">Çalışan</th>
          <th className="pb-2 text-right">Türnover tasarrufu</th>
          <th className="pb-2 text-right">Verimlilik kazanımı</th>
          <th className="pb-2 text-right">Toplam ROI</th>
        </tr>
      </thead>
      <tbody>
        {roi.map((r) => (
          <tr key={r.intervention_code} className="border-t border-[#F5F5F5]">
            <td className="py-2 text-[#0A0A0A]">{r.intervention_title}</td>
            <td className="py-2 text-right text-[#525252]">{r.cohens_d.toFixed(2)}</td>
            <td className="py-2 text-right text-[#525252]">{r.employee_count}</td>
            <td className="py-2 text-right text-[#525252]">
              {r.annual_turnover_saved.toLocaleString('tr-TR')} ₺
            </td>
            <td className="py-2 text-right text-[#525252]">
              {r.annual_productivity_gain.toLocaleString('tr-TR')} ₺
            </td>
            <td className="py-2 text-right font-medium text-[#059669]">
              {r.total_roi_try.toLocaleString('tr-TR')} ₺
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-3 text-[10px] text-[#A3A3A3]">
      Formül: ROI = (Cohen&apos;s d × 0.15) × çalışan × (aylık maaş × 12) + turnover tasarrufu.
      Kaynak: Kocoglu 2022, UpCore ROI Model v1.
    </p>
  </Card>
);
