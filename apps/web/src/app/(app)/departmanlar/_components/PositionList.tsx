'use client';

import { useState } from 'react';

interface Position {
  id: string;
  title: string;
  department: string;
  level: string;
  headcount: number;
  jdr?: {
    workload: number;
    emotionalDemand: number;
    cognitiveDemand: number;
    physicalDemand: number;
    autonomy: number;
    socialSupport: number;
    feedback: number;
    growthOpportunities: number;
  };
}

// Static data — will be replaced with API call when services are connected
const positions: Position[] = [
  {
    id: '1', title: 'Kidemli Frontend Gelistirici', department: 'Muhendislik', level: 'L4', headcount: 4,
    jdr: { workload: 4, emotionalDemand: 2, cognitiveDemand: 5, physicalDemand: 1, autonomy: 4, socialSupport: 3, feedback: 3, growthOpportunities: 4 },
  },
  {
    id: '2', title: 'Backend Gelistirici', department: 'Muhendislik', level: 'L3', headcount: 6,
    jdr: { workload: 4, emotionalDemand: 2, cognitiveDemand: 4, physicalDemand: 1, autonomy: 3, socialSupport: 3, feedback: 3, growthOpportunities: 4 },
  },
  {
    id: '3', title: 'Urun Yoneticisi', department: 'Urun', level: 'L4', headcount: 3,
    jdr: { workload: 5, emotionalDemand: 3, cognitiveDemand: 4, physicalDemand: 1, autonomy: 4, socialSupport: 4, feedback: 4, growthOpportunities: 3 },
  },
  {
    id: '4', title: 'Satis Temsilcisi', department: 'Satis', level: 'L2', headcount: 8,
    jdr: { workload: 4, emotionalDemand: 4, cognitiveDemand: 3, physicalDemand: 2, autonomy: 2, socialSupport: 3, feedback: 4, growthOpportunities: 3 },
  },
  {
    id: '5', title: 'Musteri Basari Uzmani', department: 'Musteri Hizmetleri', level: 'L3', headcount: 4,
    jdr: { workload: 3, emotionalDemand: 4, cognitiveDemand: 3, physicalDemand: 1, autonomy: 3, socialSupport: 5, feedback: 4, growthOpportunities: 3 },
  },
  {
    id: '6', title: 'IK Uzmani', department: 'Insan Kaynaklari', level: 'L3', headcount: 3,
    jdr: { workload: 3, emotionalDemand: 4, cognitiveDemand: 3, physicalDemand: 1, autonomy: 3, socialSupport: 5, feedback: 4, growthOpportunities: 3 },
  },
];

const PulseBar = ({ label, score, max, tone }: { label: string; score: number; max: number; tone?: string }) => {
  const pct = (score / max) * 100;
  const color = tone === 'high' ? '#059669' : pct > 80 ? '#DC2626' : pct > 60 ? '#D97706' : '#5E5CE6';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#888]">{label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-[#111]">{score}/{max}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#f0f0f0]">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

const JDRProfile = ({ jdr }: { jdr: NonNullable<Position['jdr']> }) => {
  const demandAvg = (jdr.workload + jdr.emotionalDemand + jdr.cognitiveDemand + jdr.physicalDemand) / 4;
  const resourceAvg = (jdr.autonomy + jdr.socialSupport + jdr.feedback + jdr.growthOpportunities) / 4;

  return (
    <div className="mt-4 grid gap-6 border-t border-[#f0f0f0] pt-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888]">Is Talepleri</p>
        <PulseBar label="Is yuku" score={jdr.workload} max={5} />
        <PulseBar label="Duygusal talep" score={jdr.emotionalDemand} max={5} />
        <PulseBar label="Bilissel talep" score={jdr.cognitiveDemand} max={5} />
        <PulseBar label="Fiziksel talep" score={jdr.physicalDemand} max={5} />
        <p className="mt-1 text-[11px] text-[#888]">
          Ortalama: <span className="font-semibold tabular-nums text-[#111]">{demandAvg.toFixed(1)}/5</span>
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888]">Is Kaynaklari</p>
        <PulseBar label="Otonomi" score={jdr.autonomy} max={5} tone="high" />
        <PulseBar label="Sosyal destek" score={jdr.socialSupport} max={5} tone="high" />
        <PulseBar label="Geri bildirim" score={jdr.feedback} max={5} tone="high" />
        <PulseBar label="Gelisim firsatlari" score={jdr.growthOpportunities} max={5} tone="high" />
        <p className="mt-1 text-[11px] text-[#888]">
          Ortalama: <span className="font-semibold tabular-nums text-[#111]">{resourceAvg.toFixed(1)}/5</span>
        </p>
      </div>
    </div>
  );
};

export const PositionList = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white">
      <div className="border-b border-[#f0f0f0] px-5 py-4">
        <h3 className="text-[15px] font-semibold text-[#111]">Pozisyonlar ve JD-R Profili</h3>
      </div>
      <div>
        <div className="divide-y divide-[#f0f0f0]">
          {positions.map((pos) => (
            <div key={pos.id} className="px-5 py-4">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === pos.id ? null : pos.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-[#111]">{pos.title}</p>
                  <p className="text-[12px] text-[#888]">{pos.department}</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-[#f0f0f0] px-2 py-0.5 text-[11px] font-medium text-[#555]">
                  {pos.level}
                </span>
                <span className="text-[12px] tabular-nums text-[#888]">{pos.headcount} kisi</span>
                <svg
                  className="h-4 w-4 text-[#888] transition-transform"
                  style={{ transform: expandedId === pos.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {expandedId === pos.id && pos.jdr && <JDRProfile jdr={pos.jdr} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
