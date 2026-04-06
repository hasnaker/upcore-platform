'use client';

import { useState, useEffect } from 'react';
import { Greeting } from './_components/Greeting';
import { PriorityActions } from './_components/PriorityActions';
import { WeeklyRecap } from './_components/WeeklyRecap';
import { ModuleOverview } from './_components/ModuleOverview';

interface BurnoutApiData {
  heatmap?: Array<{ department_name: string; week_start: string; avg_score: number; respondent_count: number }>;
  critical?: Array<{ id: number; ad: string; soyad: string; department_name: string; score: number }>;
  jdr?: Array<{ department_name: string; demands: number; resources: number }>;
  stats?: { avg_total: number; red_count: number; total_employees: number };
}

interface IntelligenceSummary {
  totalEmployees: number;
  criticalRisk: number;
  highRisk: number;
  avgOkrProgress: number;
  avgBurnout: number;
  nineBoxDistribution: Record<string, number>;
}

interface IntelligenceEmployee {
  id: string;
  name: string;
  department: string;
  synthesis: {
    riskScore: { score: number; level: string; signals: Array<{ source: string; metric: string; severity: string }>; recommendations: string[] };
    nineBox: { performance: string; potential: string; performanceScore: number; potentialScore: number };
    okrProgress: number | null;
    burnoutScore: number | null;
    feedbackAvg: number | null;
    strengthsDepth: number;
    overallHealth: string;
  };
}

export default function PanelPage() {
  const [burnoutData, setBurnoutData] = useState<BurnoutApiData | null>(null);
  const [actionData, setActionData] = useState<Record<string, unknown> | null>(null);
  const [intelligence, setIntelligence] = useState<{ employees: IntelligenceEmployee[]; summary: IntelligenceSummary } | null>(null);

  useEffect(() => {
    fetch('/api/burnout/heatmap')
      .then((r) => r.json())
      .then((data) => { if (data && (data.stats || data.critical)) setBurnoutData(data); })
      .catch(() => {});

    fetch('/api/actions')
      .then((r) => r.json())
      .then((data) => { if (data && (data.ml_actions || data.critical_employees)) setActionData(data); })
      .catch(() => {});

    fetch('/api/employee-intelligence')
      .then((r) => r.json())
      .then((data) => { if (data && data.summary) setIntelligence(data); })
      .catch(() => {});
  }, []);

  const summary = intelligence?.summary;
  const riskEmployees = intelligence?.employees?.filter((e) => e.synthesis.riskScore.level === 'critical' || e.synthesis.riskScore.level === 'high') || [];

  return (
    <div className="flex flex-col gap-12">
      {/* Greeting */}
      <Greeting />

      {/* Organization Health Dashboard */}
      {summary && (
        <section>
          <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
            Organizasyon Saglik Paneli
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <HealthCard label="Toplam Calisan" value={summary.totalEmployees} color="#0A0A0A" />
            <HealthCard label="Kritik Risk" value={summary.criticalRisk} color="#DC2626" alert={summary.criticalRisk > 0} />
            <HealthCard label="Yuksek Risk" value={summary.highRisk} color="#D97706" alert={summary.highRisk > 0} />
            <HealthCard label="OKR Ort." value={`%${summary.avgOkrProgress}`} color="#5E5CE6" />
            <HealthCard label="Tukenmislik Ort." value={summary.avgBurnout.toFixed(1)} color={summary.avgBurnout >= 2.58 ? '#D97706' : '#059669'} />
            <HealthCard
              label="Yildiz Calisan"
              value={summary.nineBoxDistribution['star'] || 0}
              color="#059669"
            />
          </div>

          {/* 9-Box Mini Distribution */}
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[
              { key: 'star', label: 'Yildiz', color: '#059669', bg: '#DCFCE7' },
              { key: 'growth', label: 'Buyume', color: '#0EA5E9', bg: '#E0F2FE' },
              { key: 'solid', label: 'Saglam', color: '#D97706', bg: '#FEF3C7' },
              { key: 'average', label: 'Orta', color: '#737373', bg: '#F5F5F5' },
              { key: 'risk', label: 'Riskli', color: '#DC2626', bg: '#FEE2E2' },
            ].map((cat) => (
              <div key={cat.key} className="flex items-center gap-2 rounded-lg p-3" style={{ background: cat.bg }}>
                <span className="text-[20px] font-bold" style={{ color: cat.color }}>
                  {summary.nineBoxDistribution[cat.key] || 0}
                </span>
                <span className="text-[11px] font-medium" style={{ color: cat.color }}>
                  {cat.label}
                </span>
              </div>
            ))}
          </div>

          {/* At-Risk Employees */}
          {riskEmployees.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] p-4">
              <div className="mb-3 text-[12px] font-semibold text-[#DC2626]">
                Dikkat Gerektiren Calisanlar ({riskEmployees.length})
              </div>
              <div className="flex flex-col gap-2">
                {riskEmployees.slice(0, 5).map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                    <div>
                      <span className="text-[13px] font-medium text-[#111]">{emp.name}</span>
                      <span className="ml-2 text-[11px] text-[#888]">{emp.department}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold" style={{ color: emp.synthesis.riskScore.level === 'critical' ? '#DC2626' : '#D97706' }}>
                        Risk: {emp.synthesis.riskScore.score}
                      </span>
                      {emp.synthesis.riskScore.signals[0] && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{
                          background: emp.synthesis.riskScore.signals[0].severity === 'critical' ? '#FEE2E2' : '#FEF3C7',
                          color: emp.synthesis.riskScore.signals[0].severity === 'critical' ? '#DC2626' : '#D97706',
                        }}>
                          {emp.synthesis.riskScore.signals[0].source}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {riskEmployees.length > 0 && riskEmployees[0]?.synthesis.riskScore.recommendations[0] && (
                <div className="mt-3 rounded-lg bg-white p-3">
                  <div className="text-[11px] font-semibold text-[#5E5CE6]">Oneri:</div>
                  <div className="mt-1 text-[12px] text-[#555]">
                    {riskEmployees[0].synthesis.riskScore.recommendations[0]}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Priority Actions */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
            Oncelikli Aksiyonlar
          </h2>
        </div>
        <PriorityActions burnoutData={burnoutData} />
      </section>

      {/* Weekly Recap */}
      <section>
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
          Bu Hafta
        </h2>
        <WeeklyRecap />
      </section>

      {/* Module Overview */}
      <section>
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
          Moduller
        </h2>
        <ModuleOverview />
      </section>
    </div>
  );
}

function HealthCard({ label, value, color, alert }: { label: string; value: string | number; color: string; alert?: boolean }) {
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: alert ? '#FCA5A5' : '#f0f0f0' }}>
      <div className="text-[11px] font-medium text-[#888]">{label}</div>
      <div className="mt-1 text-[22px] font-bold" style={{ color }}>{value}</div>
      {alert && <div className="mt-1 h-1 w-full rounded-full bg-[#FEE2E2]"><div className="h-1 animate-pulse rounded-full bg-[#DC2626]" style={{ width: '100%' }} /></div>}
    </div>
  );
}
