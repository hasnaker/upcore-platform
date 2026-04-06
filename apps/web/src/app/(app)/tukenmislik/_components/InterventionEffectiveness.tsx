'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Target } from 'lucide-react';

interface InterventionResult {
  type: string;
  count: number;
  avgBatDrop: number;
  cohensD: number;
  effectLabel: string;
  effectColor: string;
  employees: Array<{
    name: string;
    before: number;
    after: number;
    status: 'completed' | 'in-progress';
  }>;
}

const interventions: InterventionResult[] = [
  {
    type: 'Bireysel Kocluk',
    count: 3,
    avgBatDrop: -0.4,
    cohensD: 0.54,
    effectLabel: 'Orta',
    effectColor: '#D97706',
    employees: [
      { name: 'Burak Arslan', before: 3.82, after: 3.45, status: 'in-progress' },
      { name: 'Ahmet Yilmaz', before: 2.95, after: 2.60, status: 'in-progress' },
      { name: 'Zeynep Koc', before: 3.15, after: 2.70, status: 'completed' },
    ],
  },
  {
    type: 'Is Yuku Azaltma',
    count: 2,
    avgBatDrop: -0.6,
    cohensD: 0.72,
    effectLabel: 'Yuksek',
    effectColor: '#059669',
    employees: [
      { name: 'Deniz Kara', before: 3.41, after: 2.80, status: 'in-progress' },
      { name: 'Emre Cetin', before: 2.82, after: 2.25, status: 'completed' },
    ],
  },
  {
    type: 'Esneklik Artirma',
    count: 1,
    avgBatDrop: -0.3,
    cohensD: 0.38,
    effectLabel: 'Dusuk-Orta',
    effectColor: '#D97706',
    employees: [
      { name: 'Ali Demir', before: 2.71, after: 2.40, status: 'in-progress' },
    ],
  },
];

const bestIntervention = interventions.reduce((a, b) => (a.cohensD > b.cohensD ? a : b));

export const InterventionEffectiveness = () => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const totalCount = interventions.reduce((sum, i) => sum + i.count, 0);
  const completedCount = interventions.reduce(
    (sum, i) => sum + i.employees.filter((e) => e.status === 'completed').length,
    0,
  );

  return (
    <div className="rounded-lg border border-[#EDEDED] bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between border-b border-[#EDEDED] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#0A0A0A]">
            Mudahale Etkinlik Panosu
          </h2>
          <p className="mt-0.5 text-xs text-[#A3A3A3]">
            Son 30 gunde yapilan mudahaleler ve sonuclari
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF0FD] px-2.5 py-1 text-[11px] font-medium text-[#5E5CE6]">
            <Target className="h-3 w-3" />
            {totalCount} mudahale
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2.5 py-1 text-[11px] font-medium text-[#059669]">
            <CheckCircle className="h-3 w-3" />
            {completedCount} tamamlandi
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 border-b border-[#EDEDED] p-5 sm:grid-cols-3">
        {interventions.map((intervention, idx) => {
          const isExpanded = expandedIdx === idx;
          return (
            <div key={intervention.type} className="flex flex-col">
              <button
                type="button"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="flex flex-col rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4 text-left transition-all hover:border-[#D4D4D4]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#0A0A0A]">{intervention.type}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-[#A3A3A3]" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-[#A3A3A3]" />
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-[#A3A3A3]">{intervention.count} kisi</p>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#A3A3A3]">Ort. BAT Dususu</p>
                    <p className="text-lg font-bold tabular-nums text-[#059669]">{intervention.avgBatDrop}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#A3A3A3]">Cohen&apos;s d</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color: intervention.effectColor }}>
                      {intervention.cohensD.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Effect label */}
                <div className="mt-2">
                  <span
                    className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${intervention.effectColor}15`,
                      color: intervention.effectColor,
                    }}
                  >
                    Etki: {intervention.effectLabel}
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'mt-2 max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="rounded-lg border border-[#EDEDED] bg-white">
                  <div className="divide-y divide-[#EDEDED]">
                    {intervention.employees.map((emp) => {
                      const change = (emp.after - emp.before).toFixed(2);
                      return (
                        <div key={emp.name} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[9px] font-medium text-[#525252]">
                            {emp.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-[#0A0A0A]">{emp.name}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] tabular-nums text-[#DC2626]">{emp.before.toFixed(2)}</span>
                            <span className="text-[10px] text-[#A3A3A3]">{'\u2192'}</span>
                            <span className="text-[11px] font-semibold tabular-nums text-[#059669]">{emp.after.toFixed(2)}</span>
                            <span className="text-[10px] font-semibold tabular-nums text-[#059669]">({change})</span>
                          </div>
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                              emp.status === 'completed'
                                ? 'bg-[#D1FAE5] text-[#059669]'
                                : 'bg-[#EEF0FD] text-[#5E5CE6]'
                            }`}
                          >
                            {emp.status === 'completed' ? 'Bitti' : 'Devam'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Best intervention highlight */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 rounded-lg border border-[#059669]/20 bg-[#F0FDF4] p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D1FAE5]">
            <Target className="h-4 w-4 text-[#059669]" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#059669]">
              En etkili mudahale: {bestIntervention.type}
            </p>
            <p className="mt-0.5 text-[11px] text-[#525252]">
              Cohen&apos;s d = {bestIntervention.cohensD.toFixed(2)} (buyuk etki esigi: 0.80). Ortalama BAT dususu: {bestIntervention.avgBatDrop}. Bu mudahale tipi oncelikli olarak uygulanmasi onerilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
