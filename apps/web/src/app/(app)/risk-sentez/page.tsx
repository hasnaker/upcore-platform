'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ─── Types ─── */

interface RiskSignal {
  source: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
}

interface EmployeeRisk {
  id: string;
  name: string;
  department: string;
  riskScore: number;
  riskLevel: string;
  signals: RiskSignal[];
  recommendations: string[];
  okrProgress: number | null;
  burnoutScore: number | null;
  feedbackAvg: number | null;
  strengthsDepth: number;
  overallHealth: string;
  nineBox: { performance: string; potential: string; performanceScore: number; potentialScore: number };
}

const RISK_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#DC2626', bg: '#FEE2E2', label: 'Kritik' },
  high: { color: '#D97706', bg: '#FEF3C7', label: 'Yuksek' },
  medium: { color: '#5E5CE6', bg: '#f0f0ff', label: 'Orta' },
  low: { color: '#059669', bg: '#D1FAE5', label: 'Dusuk' },
};

const HEALTH_LABELS: Record<string, { color: string; label: string }> = {
  good: { color: '#059669', label: 'Saglikli' },
  fair: { color: '#D97706', label: 'Dikkat' },
  poor: { color: '#DC2626', label: 'Riskli' },
  critical: { color: '#DC2626', label: 'Kritik' },
};

const SOURCE_LABELS: Record<string, string> = {
  'BAT-12-TR': 'Tukenmislik',
  'OKR': 'OKR Performans',
  '360°': '360 Geri Bildirim',
  'Akran Karşılaştırma': 'Akran Sapma',
};

export default function RiskSentezPage() {
  const [employees, setEmployees] = useState<EmployeeRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/employee-intelligence')
      .then((r) => r.json())
      .then((data) => {
        if (data.employees) {
          const mapped: EmployeeRisk[] = data.employees.map((e: Record<string, unknown>) => {
            const s = e['synthesis'] as Record<string, unknown>;
            const risk = s['riskScore'] as Record<string, unknown>;
            const nb = s['nineBox'] as Record<string, unknown>;
            return {
              id: e['id'],
              name: e['name'],
              department: e['department'],
              riskScore: (risk['score'] as number) || 0,
              riskLevel: (risk['level'] as string) || 'low',
              signals: (risk['signals'] as RiskSignal[]) || [],
              recommendations: (risk['recommendations'] as string[]) || [],
              okrProgress: s['okrProgress'] as number | null,
              burnoutScore: s['burnoutScore'] as number | null,
              feedbackAvg: s['feedbackAvg'] as number | null,
              strengthsDepth: (s['strengthsDepth'] as number) || 0,
              overallHealth: (s['overallHealth'] as string) || 'fair',
              nineBox: {
                performance: (nb['performance'] as string) || 'medium',
                potential: (nb['potential'] as string) || 'medium',
                performanceScore: (nb['performanceScore'] as number) || 50,
                potentialScore: (nb['potentialScore'] as number) || 50,
              },
            };
          });
          mapped.sort((a, b) => b.riskScore - a.riskScore);
          setEmployees(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'all' ? employees : employees.filter((e) => e.riskLevel === filter);
  const criticalCount = employees.filter((e) => e.riskLevel === 'critical').length;
  const highCount = employees.filter((e) => e.riskLevel === 'high').length;
  const avgRisk = employees.length > 0 ? Math.round(employees.reduce((s, e) => s + e.riskScore, 0) / employees.length) : 0;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f0f0f0] border-t-[#5E5CE6]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Risk Sentez Paneli</h1>
        <p className="mt-1 text-sm text-[#525252]">
          Tum modullerin birlesimiyle calisan risk analizi. Tukenmislik + OKR + 360 + Baglilik → Birlestirme.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
          <div className="text-[11px] font-medium text-[#888]">Toplam Calisan</div>
          <div className="mt-1 text-[22px] font-bold text-[#0A0A0A]">{employees.length}</div>
        </div>
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <div className="text-[11px] font-medium text-[#DC2626]">Kritik Risk</div>
          <div className="mt-1 text-[22px] font-bold text-[#DC2626]">{criticalCount}</div>
        </div>
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
          <div className="text-[11px] font-medium text-[#D97706]">Yuksek Risk</div>
          <div className="mt-1 text-[22px] font-bold text-[#D97706]">{highCount}</div>
        </div>
        <div className="rounded-xl border border-[#f0f0f0] bg-white p-4">
          <div className="text-[11px] font-medium text-[#888]">Ort. Risk Skoru</div>
          <div className="mt-1 text-[22px] font-bold" style={{ color: avgRisk >= 55 ? '#DC2626' : avgRisk >= 35 ? '#D97706' : '#059669' }}>{avgRisk}/100</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'all' as const, label: 'Tumu', count: employees.length },
          { key: 'critical' as const, label: 'Kritik', count: criticalCount },
          { key: 'high' as const, label: 'Yuksek', count: highCount },
          { key: 'medium' as const, label: 'Orta', count: employees.filter((e) => e.riskLevel === 'medium').length },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-lg px-4 py-2 text-[12px] font-medium transition ${filter === f.key ? 'bg-[#5E5CE6] text-white' : 'bg-[#f5f5f5] text-[#737373] hover:bg-[#eee]'}`}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Employee Risk Cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((emp) => {
          const rc = RISK_COLORS[emp.riskLevel] || RISK_COLORS['low']!;
          const health = HEALTH_LABELS[emp.overallHealth] || HEALTH_LABELS['fair']!;
          const isExpanded = expandedId === emp.id;

          return (
            <div key={emp.id} className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: emp.riskLevel === 'critical' ? '#FECACA' : '#f0f0f0' }}>
              {/* Header row */}
              <button onClick={() => setExpandedId(isExpanded ? null : emp.id)} className="flex w-full items-center gap-4 p-5 text-left">
                {/* Risk gauge */}
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl" style={{ background: rc.bg }}>
                  <span className="text-[18px] font-bold" style={{ color: rc.color }}>{emp.riskScore}</span>
                  <span className="text-[8px] font-semibold" style={{ color: rc.color }}>RISK</span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/calisanlar/${emp.id}`} className="text-[14px] font-semibold text-[#0A0A0A] hover:text-[#5E5CE6]" onClick={(e) => e.stopPropagation()}>
                      {emp.name}
                    </Link>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ color: health.color, background: `${health.color}15` }}>{health.label}</span>
                  </div>
                  <div className="mt-1 text-[12px] text-[#888]">{emp.department}</div>
                </div>

                {/* Quick metrics */}
                <div className="hidden items-center gap-4 sm:flex">
                  {emp.burnoutScore !== null && (
                    <div className="text-center">
                      <div className="text-[10px] text-[#888]">BAT-12</div>
                      <div className="text-[13px] font-bold" style={{ color: emp.burnoutScore >= 3.02 ? '#DC2626' : emp.burnoutScore >= 2.58 ? '#D97706' : '#059669' }}>
                        {emp.burnoutScore.toFixed(1)}
                      </div>
                    </div>
                  )}
                  {emp.okrProgress !== null && (
                    <div className="text-center">
                      <div className="text-[10px] text-[#888]">OKR</div>
                      <div className="text-[13px] font-bold" style={{ color: emp.okrProgress >= 70 ? '#059669' : emp.okrProgress >= 50 ? '#D97706' : '#DC2626' }}>
                        %{emp.okrProgress}
                      </div>
                    </div>
                  )}
                  {emp.feedbackAvg !== null && (
                    <div className="text-center">
                      <div className="text-[10px] text-[#888]">360°</div>
                      <div className="text-[13px] font-bold" style={{ color: emp.feedbackAvg >= 4 ? '#059669' : emp.feedbackAvg >= 3 ? '#D97706' : '#DC2626' }}>
                        {emp.feedbackAvg.toFixed(1)}
                      </div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-[10px] text-[#888]">9-Box</div>
                    <div className="text-[11px] font-bold text-[#5E5CE6]">
                      {emp.nineBox.performanceScore}/{emp.nineBox.potentialScore}
                    </div>
                  </div>
                </div>

                {/* Expand arrow */}
                <svg className={`h-4 w-4 shrink-0 text-[#ccc] transition ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-[#f5f5f5] px-5 pb-5 pt-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Risk Signals — WHY */}
                    <div>
                      <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#A3A3A3]">Neden Risk Altinda?</h4>
                      {emp.signals.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {emp.signals.map((signal, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-lg p-3" style={{ background: signal.severity === 'critical' ? '#FEF2F2' : '#FFFBEB' }}>
                              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: signal.severity === 'critical' ? '#DC2626' : '#D97706' }} />
                              <div>
                                <span className="text-[12px] font-semibold" style={{ color: signal.severity === 'critical' ? '#DC2626' : '#D97706' }}>
                                  {SOURCE_LABELS[signal.source] || signal.source}
                                </span>
                                <span className="ml-2 text-[12px] text-[#555]">
                                  {signal.metric}: {typeof signal.value === 'number' ? signal.value.toFixed(1) : signal.value}
                                  {signal.threshold ? ` (esik: ${signal.threshold})` : ''}
                                </span>
                              </div>
                            </div>
                          ))}

                          {/* Cross-module correlation explanation */}
                          <div className="mt-2 rounded-lg border border-[#E0E0FF] bg-[#FAFAFF] p-3">
                            <div className="text-[11px] font-semibold text-[#5E5CE6]">Cross-Module Korelasyon</div>
                            <div className="mt-1 text-[12px] text-[#555]">
                              {emp.burnoutScore !== null && emp.burnoutScore >= 2.58 && emp.okrProgress !== null && emp.okrProgress < 60
                                ? `Yuksek tukenmislik (${emp.burnoutScore.toFixed(1)}) + dusuk OKR (%${emp.okrProgress}) birlikte goruluyor → isten ayrilma olasiligi yuksek. Oncelikli mudahale gerekli.`
                                : emp.burnoutScore !== null && emp.burnoutScore >= 2.58
                                  ? `Tukenmislik skoru uyari bolgesinde (${emp.burnoutScore.toFixed(1)}). Henuz performansa yansimamis ama onleyici mudahale kritik.`
                                  : emp.okrProgress !== null && emp.okrProgress < 50
                                    ? `Dusuk OKR performansi (%${emp.okrProgress}). Hedef revizyonu veya koçluk gorusmesi oneriliyor.`
                                    : `Genel risk orta seviyede. Duzenli takip ile izleme oneriliyor.`}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[12px] text-[#888]">Belirgin risk sinyali bulunmuyor.</div>
                      )}
                    </div>

                    {/* Recommendations — WHAT TO DO */}
                    <div>
                      <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-[#A3A3A3]">Onerilen Aksiyonlar</h4>
                      <div className="flex flex-col gap-2">
                        {emp.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-lg border border-[#f0f0f0] bg-white p-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0f0ff] text-[10px] font-bold text-[#5E5CE6]">
                              {i + 1}
                            </div>
                            <span className="text-[12px] text-[#525252]">{rec}</span>
                          </div>
                        ))}
                      </div>

                      {/* Quick action buttons */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/calisanlar/${emp.id}`} className="rounded-lg bg-[#5E5CE6] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#4B49B6]">
                          Profil Gor
                        </Link>
                        {emp.burnoutScore !== null && emp.burnoutScore >= 2.58 && (
                          <Link href="/tukenmislik" className="rounded-lg bg-[#DC2626] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#B91C1C]">
                            Tukenmislik Mudahalesi
                          </Link>
                        )}
                        {emp.okrProgress !== null && emp.okrProgress < 50 && (
                          <Link href="/performans" className="rounded-lg bg-[#D97706] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#B45309]">
                            OKR Revizyon
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
