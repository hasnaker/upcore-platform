'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

interface CompEmployee {
  name: string;
  department: string;
  baseSalary: number;
  bonusTargetPct: number;
  benefitsPackage: string;
  compaRatio: number;
}

interface SalaryBand {
  jobLevel: string;
  jobFamily: string;
  min: number;
  mid: number;
  max: number;
}

interface CompStats {
  avgSalary: number;
  medianSalary: number;
  totalPayroll: number;
  avgCompaRatio: number;
}

export default function UcretlendirmePage() {
  const [employees, setEmployees] = useState<CompEmployee[]>([]);
  const [bands, setBands] = useState<SalaryBand[]>([]);
  const [stats, setStats] = useState<CompStats | null>(null);
  const [tab, setTab] = useState<'overview' | 'bands' | 'equity'>('overview');

  useEffect(() => {
    fetch('/api/compensation')
      .then((r) => r.json())
      .then((data) => {
        if (data.employees) setEmployees(data.employees);
        if (data.bands) setBands(data.bands);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Ucretlendirme & Yan Haklar</h1>
          <p className="mt-1 text-sm text-[#525252]">Maas bantlari, toplam odul ve ucret adaleti analizi.</p>
        </div>
        <button onClick={() => window.open('/api/export?type=employees', '_blank')} className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] px-3 py-2 text-[12px] font-medium text-[#525252] hover:bg-[#fafafa]">
          <Download className="h-3.5 w-3.5" /> CSV Indir
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Ortalama Maas" value={formatCurrency(stats.avgSalary)} color="#5E5CE6" />
          <StatCard label="Medyan Maas" value={formatCurrency(stats.medianSalary)} color="#0A0A0A" />
          <StatCard label="Toplam Bordro" value={formatCurrency(stats.totalPayroll)} color="#059669" />
          <StatCard label="Ort. Compa-Ratio" value={stats.avgCompaRatio.toFixed(2)} color={stats.avgCompaRatio >= 0.95 ? '#059669' : '#D97706'} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-1">
        {[
          { key: 'overview' as const, label: 'Calisan Ucretleri' },
          { key: 'bands' as const, label: 'Maas Bantlari' },
          { key: 'equity' as const, label: 'Ucret Adaleti' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all ${tab === t.key ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#737373]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Employee Compensation Table */}
      {tab === 'overview' && (
        <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
                <th className="px-4 py-3 text-left font-semibold text-[#525252]">Calisan</th>
                <th className="px-4 py-3 text-left font-semibold text-[#525252]">Departman</th>
                <th className="px-4 py-3 text-right font-semibold text-[#525252]">Baz Maas</th>
                <th className="px-4 py-3 text-center font-semibold text-[#525252]">Bonus %</th>
                <th className="px-4 py-3 text-center font-semibold text-[#525252]">Paket</th>
                <th className="px-4 py-3 text-center font-semibold text-[#525252]">Compa-Ratio</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const crColor = emp.compaRatio >= 1.05 ? '#059669' : emp.compaRatio >= 0.95 ? '#5E5CE6' : emp.compaRatio >= 0.85 ? '#D97706' : '#DC2626';
                return (
                  <tr key={emp.name} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">{emp.name}</td>
                    <td className="px-4 py-3 text-[#737373]">{emp.department}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0A0A0A]">{formatCurrency(emp.baseSalary)}</td>
                    <td className="px-4 py-3 text-center text-[#525252]">%{emp.bonusTargetPct}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${emp.benefitsPackage === 'premium' ? 'bg-[#f0f0ff] text-[#5E5CE6]' : emp.benefitsPackage === 'standard' ? 'bg-[#F5F5F5] text-[#525252]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                        {emp.benefitsPackage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold" style={{ color: crColor }}>{emp.compaRatio.toFixed(2)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Salary Bands */}
      {tab === 'bands' && (
        <div className="grid gap-3">
          {bands.map((band, i) => {
            const range = band.max - band.min;
            const midPct = ((band.mid - band.min) / range) * 100;
            return (
              <div key={i} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[14px] font-semibold text-[#0A0A0A] capitalize">{band.jobLevel}</span>
                    <span className="ml-2 text-[12px] text-[#888] capitalize">{band.jobFamily}</span>
                  </div>
                  <span className="text-[12px] text-[#888]">{formatCurrency(band.min)} — {formatCurrency(band.max)}</span>
                </div>
                <div className="relative mt-3 h-6 overflow-hidden rounded-full bg-[#f0f0f0]">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5E5CE6]/20 to-[#5E5CE6]/60" style={{ width: '100%' }} />
                  <div className="absolute top-0 h-full w-0.5 bg-[#5E5CE6]" style={{ left: `${midPct}%` }} title={`Orta: ${formatCurrency(band.mid)}`} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-[#aaa]">
                  <span>{formatCurrency(band.min)}</span>
                  <span className="font-semibold text-[#5E5CE6]">Orta: {formatCurrency(band.mid)}</span>
                  <span>{formatCurrency(band.max)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pay Equity Analysis */}
      {tab === 'equity' && (
        <div className="rounded-xl border border-[#f0f0f0] bg-white p-6">
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Ucret Adaleti Analizi</h3>
          <p className="mt-1 text-[12px] text-[#888]">Compa-ratio dagilimi — 1.0 = bant ortasi</p>
          <div className="mt-6 flex flex-col gap-3">
            {employees.sort((a, b) => b.compaRatio - a.compaRatio).map((emp) => {
              const pct = Math.min(100, Math.max(0, emp.compaRatio * 50)); // 0.80→40%, 1.0→50%, 1.20→60%
              const color = emp.compaRatio >= 1.05 ? '#059669' : emp.compaRatio >= 0.95 ? '#5E5CE6' : emp.compaRatio >= 0.85 ? '#D97706' : '#DC2626';
              return (
                <div key={emp.name} className="flex items-center gap-3">
                  <span className="w-[120px] shrink-0 truncate text-[12px] font-medium text-[#525252]">{emp.name}</span>
                  <div className="relative h-5 flex-1 rounded-full bg-[#f0f0f0]">
                    <div className="absolute top-0 h-full w-px bg-[#ccc]" style={{ left: '50%' }} />
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
                  </div>
                  <span className="w-[50px] text-right text-[12px] font-bold" style={{ color }}>{emp.compaRatio.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center text-[10px] text-[#aaa]">← Bant alti | Bant ortasi (1.0) | Bant ustu →</div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
      <div className="text-[11px] font-medium text-[#888]">{label}</div>
      <div className="mt-1 text-[22px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
