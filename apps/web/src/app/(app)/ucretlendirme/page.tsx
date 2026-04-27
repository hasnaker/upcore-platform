'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Plus, X, AlertTriangle, Calculator } from 'lucide-react';

/* ─── Types ─── */

interface CompEmployee {
  id?: string;
  name: string;
  department: string;
  baseSalary: number;
  bonusTargetPct: number;
  benefitsPackage: string;
  compaRatio: number;
  performanceScore?: number;
}

interface SalaryBand {
  jobLevel: string;
  jobFamily: string;
  min: number;
  mid: number;
  max: number;
}

interface CompReview {
  id: string;
  employee: string;
  cycle: string;
  currentSalary: number | null;
  proposedSalary: number | null;
  increasePct: number | null;
  status: string;
}

interface CompStats {
  avgSalary: number;
  medianSalary: number;
  totalPayroll: number;
  avgCompaRatio: number;
}

/* ─── Merit Matrix: Performance → Increase % ─── */
const MERIT_MATRIX: Record<string, { min: number; mid: number; max: number; label: string }> = {
  exceptional: { min: 12, mid: 15, max: 20, label: 'Olağanüstü (90+)' },
  exceeds: { min: 8, mid: 10, max: 14, label: 'Beklentiyi Aşan (80-89)' },
  meets: { min: 4, mid: 6, max: 8, label: 'Beklentiyi Karşılayan (65-79)' },
  developing: { min: 0, mid: 2, max: 4, label: 'Gelişmekte (50-64)' },
  below: { min: 0, mid: 0, max: 0, label: 'Beklenti Altı (<50)' },
};

const BENEFITS_VALUE: Record<string, number> = {
  premium: 12000,
  standard: 7500,
  basic: 4000,
};

export default function UcretlendirmePage() {
  const [employees, setEmployees] = useState<CompEmployee[]>([]);
  const [bands, setBands] = useState<SalaryBand[]>([]);
  const [, setReviews] = useState<CompReview[]>([]);
  const [stats, setStats] = useState<CompStats | null>(null);
  const [tab, setTab] = useState<'overview' | 'bands' | 'equity' | 'merit' | 'scenario' | 'total-rewards'>('overview');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [scenarioDept, setScenarioDept] = useState('Tümü');
  const [scenarioIncrease, setScenarioIncrease] = useState(10);

  const fetchData = useCallback(() => {
    fetch('/api/compensation')
      .then((r) => r.json())
      .then((data) => {
        if (data.employees) setEmployees(data.employees);
        if (data.bands) setBands(data.bands);
        if (data.reviews) setReviews(data.reviews);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];

  // Compa-ratio alerts
  const alerts = employees.filter((e) => e.compaRatio < 0.85 || e.compaRatio > 1.15);

  // Scenario calculation
  const scenarioEmployees = scenarioDept === 'Tümü' ? employees : employees.filter((e) => e.department === scenarioDept);
  const currentTotal = scenarioEmployees.reduce((s, e) => s + e.baseSalary, 0);
  const proposedTotal = currentTotal * (1 + scenarioIncrease / 100);
  const costDelta = proposedTotal - currentTotal;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Ucretlendirme & Yan Haklar</h1>
          <p className="mt-1 text-sm text-[#525252]">Maas bantlari, merit matrix, senaryo modelleme ve ucret adaleti.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowReviewModal(true)} className="flex items-center gap-2 rounded-lg bg-[#5E5CE6] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#4B49B6]">
            <Plus className="h-3.5 w-3.5" /> Maas Artisi Teklifi
          </button>
          <button onClick={() => window.open('/api/export?type=employees', '_blank')} className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] px-3 py-2 text-[12px] font-medium text-[#525252] hover:bg-[#fafafa]">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Compa-Ratio Alerts with Actions */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" />
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[#DC2626]">Ucret Uyarisi — {alerts.length} Calisan</div>
              <div className="mt-1 text-[11px] text-[#991B1B]">Compa-ratio 0.85 altı veya 1.15 üstü olanlar. Acil değerlendirme gerekli.</div>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {alerts.map((a) => {
              const isBelow = a.compaRatio < 0.85;
              const band = bands.find((b) => a.baseSalary >= b.min && a.baseSalary <= b.max);
              const targetSalary = band ? band.mid : Math.round(a.baseSalary * (isBelow ? 1.10 : 0.95));
              const adjustPct = Math.round(((targetSalary / a.baseSalary) - 1) * 100);
              return (
                <div key={a.name} className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: isBelow ? '#FEE2E2' : '#FEF3C7', color: isBelow ? '#DC2626' : '#D97706' }}>
                      {a.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <span className="text-[12px] font-medium text-[#111]">{a.name}</span>
                      <span className="ml-2 text-[11px] text-[#888]">{a.department}</span>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: isBelow ? '#FEE2E2' : '#FEF3C7', color: isBelow ? '#DC2626' : '#D97706' }}>
                      CR: {a.compaRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[10px] text-[#888]">Mevcut: {formatCurrency(a.baseSalary)}</div>
                      <div className="text-[10px] font-semibold text-[#5E5CE6]">Önerilen: {formatCurrency(targetSalary)} ({adjustPct > 0 ? '+' : ''}{adjustPct}%)</div>
                    </div>
                    <button
                      onClick={() => {
                        fetch('/api/compensation', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            employeeName: a.name,
                            currentSalary: a.baseSalary,
                            proposedSalary: targetSalary,
                            increasePct: adjustPct,
                            reason: isBelow ? 'equity' : 'market',
                          }),
                        }).then(() => fetchData()).catch(() => {});
                      }}
                      className="rounded-lg bg-[#5E5CE6] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#4B49B6]"
                    >
                      {isBelow ? 'Düzeltme Teklifi' : 'İncele'}
                    </button>
                    <button
                      onClick={() => { setShowReviewModal(true); }}
                      className="rounded-lg border border-[#e5e5e5] px-3 py-1.5 text-[11px] font-medium text-[#525252] hover:bg-[#fafafa]"
                    >
                      Manuel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
      <div className="flex flex-wrap gap-1 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-1">
        {[
          { key: 'overview' as const, label: 'Ucretler' },
          { key: 'bands' as const, label: 'Bantlar' },
          { key: 'equity' as const, label: 'Adalet' },
          { key: 'merit' as const, label: 'Merit Matrix' },
          { key: 'scenario' as const, label: 'Senaryo' },
          { key: 'total-rewards' as const, label: 'Toplam Odul' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-all ${tab === t.key ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#737373]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Employee Compensation */}
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
                <th className="px-4 py-3 text-center font-semibold text-[#525252]">Toplam Odul</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const crColor = emp.compaRatio >= 1.05 ? '#059669' : emp.compaRatio >= 0.95 ? '#5E5CE6' : emp.compaRatio >= 0.85 ? '#D97706' : '#DC2626';
                const totalReward = emp.baseSalary * 12 + emp.baseSalary * 12 * (emp.bonusTargetPct / 100) + (BENEFITS_VALUE[emp.benefitsPackage] ?? 0);
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
                    <td className="px-4 py-3 text-right text-[11px] font-semibold text-[#059669]">{formatCurrency(totalReward)}/yıl</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Salary Bands */}
      {tab === 'bands' && (
        <div className="grid gap-3">
          {bands.map((band, i) => {
            const range = band.max - band.min || 1;
            const midPct = ((band.mid - band.min) / range) * 100;
            const empsInBand = employees.filter((e) => e.baseSalary >= band.min && e.baseSalary <= band.max);
            return (
              <div key={i} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[14px] font-semibold text-[#0A0A0A] capitalize">{band.jobLevel}</span>
                    <span className="ml-2 text-[12px] text-[#888] capitalize">{band.jobFamily}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-[#888]">{formatCurrency(band.min)} — {formatCurrency(band.max)}</span>
                    <span className="rounded-full bg-[#f0f0ff] px-2 py-0.5 text-[10px] font-semibold text-[#5E5CE6]">{empsInBand.length} kisi</span>
                  </div>
                </div>
                <div className="relative mt-3 h-8 overflow-hidden rounded-full bg-[#f0f0f0]">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5E5CE6]/20 to-[#5E5CE6]/60" style={{ width: '100%' }} />
                  <div className="absolute top-0 h-full w-0.5 bg-[#5E5CE6]" style={{ left: `${midPct}%` }} />
                  {/* Plot employees on the band */}
                  {empsInBand.map((emp) => {
                    const empPct = ((emp.baseSalary - band.min) / range) * 100;
                    return (
                      <div key={emp.name} className="absolute top-1 h-6 w-6 -translate-x-1/2 rounded-full bg-[#5E5CE6] text-center text-[8px] font-bold leading-6 text-white" style={{ left: `${Math.min(95, Math.max(5, empPct))}%` }} title={`${emp.name}: ${formatCurrency(emp.baseSalary)}`}>
                        {emp.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                    );
                  })}
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

      {/* Tab: Pay Equity */}
      {tab === 'equity' && (
        <div className="space-y-6">
          {/* Department comparison */}
          <div className="rounded-xl border border-[#f0f0f0] bg-white p-6">
            <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Departman Bazli Ucret Karsilastirmasi</h3>
            <div className="mt-4 grid gap-4">
              {departments.map((dept) => {
                const deptEmps = employees.filter((e) => e.department === dept);
                const avgSal = deptEmps.reduce((s, e) => s + e.baseSalary, 0) / deptEmps.length;
                const avgCr = deptEmps.reduce((s, e) => s + e.compaRatio, 0) / deptEmps.length;
                return (
                  <div key={dept} className="flex items-center gap-4">
                    <span className="w-[140px] shrink-0 text-[12px] font-medium text-[#525252]">{dept}</span>
                    <div className="flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-[#f0f0f0]">
                        <div className="h-full rounded-full bg-[#5E5CE6]" style={{ width: `${(avgSal / (stats?.avgSalary || 1)) * 50}%` }} />
                      </div>
                    </div>
                    <span className="w-[80px] text-right text-[12px] font-semibold text-[#0A0A0A]">{formatCurrency(avgSal)}</span>
                    <span className="w-[50px] text-right text-[11px] font-bold" style={{ color: avgCr >= 0.95 ? '#059669' : '#D97706' }}>{avgCr.toFixed(2)}</span>
                    <span className="w-[40px] text-right text-[10px] text-[#888]">{deptEmps.length} kisi</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Individual compa-ratio */}
          <div className="rounded-xl border border-[#f0f0f0] bg-white p-6">
            <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Bireysel Compa-Ratio Dagilimi</h3>
            <p className="mt-1 text-[12px] text-[#888]">1.0 = bant ortası. Kırmızı = bant altı, yeşil = bant üstü.</p>
            <div className="mt-4 flex flex-col gap-2">
              {[...employees].sort((a, b) => a.compaRatio - b.compaRatio).map((emp) => {
                const pct = Math.min(100, Math.max(0, emp.compaRatio * 50));
                const color = emp.compaRatio >= 1.05 ? '#059669' : emp.compaRatio >= 0.95 ? '#5E5CE6' : emp.compaRatio >= 0.85 ? '#D97706' : '#DC2626';
                return (
                  <div key={emp.name} className="flex items-center gap-3">
                    <span className="w-[120px] shrink-0 truncate text-[12px] font-medium text-[#525252]">{emp.name}</span>
                    <div className="relative h-4 flex-1 rounded-full bg-[#f0f0f0]">
                      <div className="absolute top-0 h-full w-px bg-[#ccc]" style={{ left: '50%' }} />
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
                    </div>
                    <span className="w-[45px] text-right text-[11px] font-bold" style={{ color }}>{emp.compaRatio.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Merit Matrix */}
      {tab === 'merit' && (
        <div className="rounded-xl border border-[#f0f0f0] bg-white p-6">
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Merit Matrix — Performans → Zam Orani</h3>
          <p className="mt-1 text-[12px] text-[#888]">Performans puanına göre önerilen maaş artış yüzdeleri. Compa-ratio&apos;ya göre ayarlanır.</p>
          <div className="mt-6 overflow-hidden rounded-lg border border-[#f0f0f0]">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
                  <th className="px-4 py-3 text-left font-semibold text-[#525252]">Performans Seviyesi</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#525252]">Min %</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#525252]">Önerilen %</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#525252]">Max %</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#525252]">Çalışan Sayısı</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(MERIT_MATRIX).map(([key, row]) => {
                  const perf = key === 'exceptional' ? 90 : key === 'exceeds' ? 80 : key === 'meets' ? 65 : key === 'developing' ? 50 : 30;
                  const matchingEmps = employees.filter((e) => {
                    const score = e.performanceScore ?? 70;
                    if (key === 'exceptional') return score >= 90;
                    if (key === 'exceeds') return score >= 80 && score < 90;
                    if (key === 'meets') return score >= 65 && score < 80;
                    if (key === 'developing') return score >= 50 && score < 65;
                    return score < 50;
                  });
                  const rowColor = perf >= 80 ? '#059669' : perf >= 65 ? '#5E5CE6' : perf >= 50 ? '#D97706' : '#DC2626';
                  return (
                    <tr key={key} className="border-b border-[#f0f0f0] last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium text-[#0A0A0A]">{row.label}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold" style={{ color: rowColor }}>%{row.min}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full px-3 py-1 font-bold text-white" style={{ background: rowColor }}>%{row.mid}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold" style={{ color: rowColor }}>%{row.max}</td>
                      <td className="px-4 py-3 text-center text-[#888]">{matchingEmps.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg bg-[#FAFAFF] p-4 text-[12px] text-[#555]">
            <strong className="text-[#5E5CE6]">Not:</strong> Merit matrix, compa-ratio ile birlikte değerlendirilmelidir. Bant altı (&lt;0.85) çalışanlar için önerilen artış oranlarına ek %5 düzeltme uygulanabilir.
          </div>
        </div>
      )}

      {/* Tab: Scenario Modeling */}
      {tab === 'scenario' && (
        <div className="rounded-xl border border-[#f0f0f0] bg-white p-6">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-[#5E5CE6]" />
            <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Senaryo Modelleme</h3>
          </div>
          <p className="mt-1 text-[12px] text-[#888]">&quot;Ya %X zam verirsek?&quot; sorusuna cevap. Departman bazlı maliyet analizi.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Departman</label>
              <select value={scenarioDept} onChange={(e) => setScenarioDept(e.target.value)}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] outline-none focus:border-[#5E5CE6]">
                <option value="Tümü">Tüm Departmanlar</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Artış Oranı (%)</label>
              <input type="range" min={0} max={30} value={scenarioIncrease} onChange={(e) => setScenarioIncrease(Number(e.target.value))}
                className="w-full accent-[#5E5CE6]" />
              <div className="mt-1 text-center text-[18px] font-bold text-[#5E5CE6]">%{scenarioIncrease}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-[#f5f5f5] p-4 text-center">
              <div className="text-[11px] text-[#888]">Mevcut Bordro (Aylık)</div>
              <div className="mt-1 text-[18px] font-bold text-[#0A0A0A]">{formatCurrency(currentTotal)}</div>
            </div>
            <div className="rounded-xl bg-[#f0f0ff] p-4 text-center">
              <div className="text-[11px] text-[#888]">Önerilen Bordro (Aylık)</div>
              <div className="mt-1 text-[18px] font-bold text-[#5E5CE6]">{formatCurrency(proposedTotal)}</div>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: costDelta > 0 ? '#FEF2F2' : '#D1FAE5' }}>
              <div className="text-[11px] text-[#888]">Ek Maliyet (Aylık)</div>
              <div className="mt-1 text-[18px] font-bold" style={{ color: costDelta > 0 ? '#DC2626' : '#059669' }}>
                +{formatCurrency(costDelta)}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-[#FFFBEB] p-4 text-[12px] text-[#92400E]">
            <strong>Yıllık Etki:</strong> {formatCurrency(costDelta * 12)} ek yıllık maliyet ({scenarioEmployees.length} çalışan için).
            {scenarioDept !== 'Tümü' && ` Sadece ${scenarioDept} departmanı.`}
          </div>
        </div>
      )}

      {/* Tab: Total Rewards */}
      {tab === 'total-rewards' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#f0f0f0] bg-white p-6">
            <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Toplam Ödül Görünümü</h3>
            <p className="mt-1 text-[12px] text-[#888]">Baz maaş + bonus + yan haklar = toplam yıllık ödül</p>
          </div>
          {employees.map((emp) => {
            const annualBase = emp.baseSalary * 12;
            const annualBonus = annualBase * (emp.bonusTargetPct / 100);
            const benefitsVal = BENEFITS_VALUE[emp.benefitsPackage] ?? 0;
            const totalReward = annualBase + annualBonus + benefitsVal;
            const basePct = (annualBase / totalReward) * 100;
            const bonusPct = (annualBonus / totalReward) * 100;
            const benefitsPct = (benefitsVal / totalReward) * 100;
            return (
              <div key={emp.name} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[14px] font-semibold text-[#0A0A0A]">{emp.name}</span>
                    <span className="ml-2 text-[12px] text-[#888]">{emp.department}</span>
                  </div>
                  <span className="text-[16px] font-bold text-[#059669]">{formatCurrency(totalReward)}/yıl</span>
                </div>
                {/* Stacked bar */}
                <div className="mt-3 flex h-8 overflow-hidden rounded-full">
                  <div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${basePct}%`, background: '#5E5CE6' }} title={`Baz: ${formatCurrency(annualBase)}`}>
                    {basePct > 15 ? `Baz ${formatCurrency(annualBase)}` : ''}
                  </div>
                  <div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${bonusPct}%`, background: '#0EA5E9' }} title={`Bonus: ${formatCurrency(annualBonus)}`}>
                    {bonusPct > 10 ? `Bonus` : ''}
                  </div>
                  <div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${benefitsPct}%`, background: '#059669' }} title={`Yan Haklar: ${formatCurrency(benefitsVal)}`}>
                    {benefitsPct > 8 ? `Yan Hak` : ''}
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-[10px]">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#5E5CE6]" />Baz: {formatCurrency(annualBase)}</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#0EA5E9]" />Bonus: {formatCurrency(annualBonus)}</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#059669]" />Yan Haklar: {formatCurrency(benefitsVal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <CompReviewModal
          employees={employees}
          onClose={() => setShowReviewModal(false)}
          onSubmit={(data) => {
            fetch('/api/compensation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            }).then(() => { setShowReviewModal(false); fetchData(); }).catch(() => {});
          }}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}

/* ─── Compensation Review Modal ─── */

function CompReviewModal({ employees, onClose, onSubmit, formatCurrency }: {
  employees: CompEmployee[];
  onClose: () => void;
  onSubmit: (data: { employeeName: string; currentSalary: number; proposedSalary: number; increasePct: number; reason: string }) => void;
  formatCurrency: (val: number) => string;
}) {
  const [selectedEmp, setSelectedEmp] = useState('');
  const [increasePct, setIncreasePct] = useState(10);
  const [reason, setReason] = useState('');

  const emp = employees.find((e) => e.name === selectedEmp);
  const currentSalary = emp?.baseSalary ?? 0;
  const proposedSalary = Math.round(currentSalary * (1 + increasePct / 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-2xl border border-[#f0f0f0] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4">
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Maaş Artışı Teklifi</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-[#A3A3A3] hover:bg-[#f5f5f5]"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Çalışan</label>
            <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}
              className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] outline-none focus:border-[#5E5CE6]">
              <option value="">Seçiniz</option>
              {employees.map((e) => <option key={e.name} value={e.name}>{e.name} — {e.department}</option>)}
            </select>
          </div>
          {emp && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#f5f5f5] p-3">
                  <div className="text-[10px] text-[#888]">Mevcut Maaş</div>
                  <div className="mt-1 text-[16px] font-bold text-[#0A0A0A]">{formatCurrency(currentSalary)}</div>
                </div>
                <div className="rounded-lg bg-[#f0f0ff] p-3">
                  <div className="text-[10px] text-[#888]">Önerilen Maaş</div>
                  <div className="mt-1 text-[16px] font-bold text-[#5E5CE6]">{formatCurrency(proposedSalary)}</div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Artış Oranı: %{increasePct}</label>
                <input type="range" min={0} max={30} value={increasePct} onChange={(e) => setIncreasePct(Number(e.target.value))}
                  className="w-full accent-[#5E5CE6]" />
              </div>
            </>
          )}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#525252]">Gerekçe</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-[13px] outline-none focus:border-[#5E5CE6]">
              <option value="">Seçiniz</option>
              <option value="merit">Performans bazlı (Merit)</option>
              <option value="market">Piyasa düzeltmesi</option>
              <option value="promotion">Terfi</option>
              <option value="equity">Ücret adaleti düzeltmesi</option>
              <option value="retention">Elde tutma (Retention)</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[#f0f0f0] px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#f5f5f5]">İptal</button>
          <button
            onClick={() => emp && onSubmit({ employeeName: emp.name, currentSalary, proposedSalary, increasePct, reason })}
            disabled={!emp || !reason}
            className="rounded-lg bg-[#5E5CE6] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#4B49B6] disabled:opacity-40">
            Teklifi Gönder
          </button>
        </div>
      </div>
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
