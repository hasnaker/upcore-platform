'use client';

import { useState, useEffect } from 'react';

interface ENPSData {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
}

interface DeptScore {
  department: string;
  satisfaction: number;
  growth: number;
  culture: number;
  responseCount: number;
}

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  owner: string;
  status: string;
  dueDate: string;
}

export default function BaglilikPage() {
  const [enps, setEnps] = useState<ENPSData | null>(null);
  const [deptScores, setDeptScores] = useState<DeptScore[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [tab, setTab] = useState<'enps' | 'departments' | 'actions'>('enps');

  useEffect(() => {
    fetch('/api/engagement')
      .then((r) => r.json())
      .then((data) => {
        if (data.eNPS) setEnps(data.eNPS);
        if (data.departmentScores) setDeptScores(data.departmentScores);
        if (data.actionPlans) setActionPlans(data.actionPlans);
      })
      .catch(() => {});
  }, []);

  const enpsColor = (score: number) => score >= 50 ? '#059669' : score >= 20 ? '#5E5CE6' : score >= 0 ? '#D97706' : '#DC2626';
  const enpsLabel = (score: number) => score >= 50 ? 'Mukemmel' : score >= 20 ? 'Iyi' : score >= 0 ? 'Gelisim Gerekli' : 'Kritik';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Calisan Bagliligi</h1>
        <p className="mt-1 text-sm text-[#525252]">eNPS takibi, departman memnuniyeti ve aksiyon planlari.</p>
      </div>

      {/* eNPS Hero Card */}
      {enps && (
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12">
            {/* Score Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <svg className="absolute inset-0" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke={enpsColor(enps.score)} strokeWidth="8"
                    strokeDasharray={`${Math.max(0, (enps.score + 100) / 200) * 339} 339`}
                    strokeLinecap="round" transform="rotate(-90 60 60)" />
                </svg>
                <div className="text-center">
                  <div className="text-[28px] font-bold" style={{ color: enpsColor(enps.score) }}>{enps.score}</div>
                  <div className="text-[10px] font-semibold text-[#888]">eNPS</div>
                </div>
              </div>
              <span className="mt-2 rounded-full px-3 py-1 text-[11px] font-semibold" style={{ color: enpsColor(enps.score), background: `${enpsColor(enps.score)}15` }}>
                {enpsLabel(enps.score)}
              </span>
            </div>

            {/* Breakdown */}
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Employee Net Promoter Score</h3>
              <p className="mt-1 text-[12px] text-[#888]">
                &quot;Upcore&apos;u calisma yeri olarak arkadaslariniza tavsiye eder misiniz?&quot; (0-10)
              </p>
              <div className="mt-4 flex gap-4">
                <div className="flex-1 rounded-lg bg-[#D1FAE5] p-3 text-center">
                  <div className="text-[20px] font-bold text-[#059669]">{enps.promoters}</div>
                  <div className="text-[10px] font-semibold text-[#059669]">Promoter (9-10)</div>
                </div>
                <div className="flex-1 rounded-lg bg-[#FEF3C7] p-3 text-center">
                  <div className="text-[20px] font-bold text-[#D97706]">{enps.passives}</div>
                  <div className="text-[10px] font-semibold text-[#D97706]">Pasif (7-8)</div>
                </div>
                <div className="flex-1 rounded-lg bg-[#FEE2E2] p-3 text-center">
                  <div className="text-[20px] font-bold text-[#DC2626]">{enps.detractors}</div>
                  <div className="text-[10px] font-semibold text-[#DC2626]">Detraktor (0-6)</div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[#888]">Toplam {enps.total} yanittan. eNPS = %Promoter - %Detraktor</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-1">
        {[
          { key: 'enps' as const, label: 'Departman Detay' },
          { key: 'departments' as const, label: 'Memnuniyet Haritasi' },
          { key: 'actions' as const, label: 'Aksiyon Planlari' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all ${tab === t.key ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[#737373]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Department Scores */}
      {tab === 'enps' && (
        <div className="grid gap-3">
          {deptScores.map((dept) => {
            const avgScore = ((dept.satisfaction + dept.growth + dept.culture) / 3).toFixed(1);
            return (
              <div key={dept.department} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-semibold text-[#0A0A0A]">{dept.department}</h4>
                  <span className="text-[12px] text-[#888]">{dept.responseCount} yanit</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4">
                  {[
                    { label: 'Memnuniyet', value: dept.satisfaction, color: '#5E5CE6' },
                    { label: 'Gelisim', value: dept.growth, color: '#059669' },
                    { label: 'Kultur', value: dept.culture, color: '#D97706' },
                  ].map((dim) => (
                    <div key={dim.label}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#888]">{dim.label}</span>
                        <span className="font-bold" style={{ color: dim.color }}>{dim.value}/5</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
                        <div className="h-full rounded-full" style={{ width: `${(dim.value / 5) * 100}%`, background: dim.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-[11px] font-semibold text-[#5E5CE6]">Ortalama: {avgScore}/5</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Satisfaction Heatmap */}
      {tab === 'departments' && (
        <div className="rounded-xl border border-[#f0f0f0] bg-white p-6">
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">Departman Memnuniyet Haritasi</h3>
          <div className="overflow-hidden rounded-lg">
            <div className="grid grid-cols-4 gap-px bg-[#f0f0f0]">
              <div className="bg-[#fafafa] p-3 text-[11px] font-semibold text-[#888]">Departman</div>
              <div className="bg-[#fafafa] p-3 text-center text-[11px] font-semibold text-[#888]">Memnuniyet</div>
              <div className="bg-[#fafafa] p-3 text-center text-[11px] font-semibold text-[#888]">Gelisim</div>
              <div className="bg-[#fafafa] p-3 text-center text-[11px] font-semibold text-[#888]">Kultur</div>
              {deptScores.map((dept) => (
                <>
                  <div key={`${dept.department}-name`} className="bg-white p-3 text-[12px] font-medium text-[#0A0A0A]">{dept.department}</div>
                  {[dept.satisfaction, dept.growth, dept.culture].map((val, i) => {
                    const bg = val >= 4 ? '#D1FAE5' : val >= 3 ? '#FEF3C7' : '#FEE2E2';
                    const color = val >= 4 ? '#059669' : val >= 3 ? '#D97706' : '#DC2626';
                    return (
                      <div key={`${dept.department}-${i}`} className="flex items-center justify-center p-3" style={{ background: bg }}>
                        <span className="text-[14px] font-bold" style={{ color }}>{val}</span>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Plans */}
      {tab === 'actions' && (
        <div className="flex flex-col gap-3">
          {actionPlans.length === 0 ? (
            <div className="rounded-xl border border-[#f0f0f0] bg-white p-8 text-center text-[13px] text-[#888]">
              Henuz aksiyon plani olusturulmamis.
            </div>
          ) : (
            actionPlans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-[14px] font-semibold text-[#0A0A0A]">{plan.title}</h4>
                    {plan.description && <p className="mt-1 text-[12px] text-[#888]">{plan.description}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    plan.status === 'completed' ? 'bg-[#D1FAE5] text-[#059669]' :
                    plan.status === 'in_progress' ? 'bg-[#f0f0ff] text-[#5E5CE6]' :
                    'bg-[#F5F5F5] text-[#888]'
                  }`}>
                    {plan.status === 'completed' ? 'Tamamlandi' : plan.status === 'in_progress' ? 'Devam Ediyor' : 'Planlandi'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-[11px] text-[#888]">
                  {plan.owner && <span>Sorumlu: {plan.owner}</span>}
                  {plan.dueDate && <span>Son Tarih: {new Date(plan.dueDate).toLocaleDateString('tr-TR')}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
