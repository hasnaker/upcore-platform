'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowRight, Minus, Check, Clock, Activity } from 'lucide-react';

interface CriticalEmployee {
  id: string;
  name: string;
  department: string;
  riskPercent: number;
  trend: 'rising' | 'stable' | 'falling';
  intervention: {
    type: string;
    status: 'active' | 'proposed' | 'none';
  };
  jdrGap: number;
  weeklyScores: number[];
}

interface ApiCriticalEmployee {
  id: number;
  ad: string;
  soyad: string;
  department_name: string;
  score: number;
}

interface CriticalEmployeesProps {
  apiData?: {
    critical?: ApiCriticalEmployee[];
    jdr?: Array<{ department_name: string; demands: number; resources: number }>;
  } | null;
}

const fallbackEmployees: CriticalEmployee[] = [
  {
    id: '1',
    name: 'Burak Arslan',
    department: 'Satis',
    riskPercent: 82,
    trend: 'rising',
    intervention: { type: 'Haftalik kocluk', status: 'active' },
    jdrGap: 22,
    weeklyScores: [65, 70, 76, 82],
  },
  {
    id: '2',
    name: 'Deniz Kara',
    department: 'Satis',
    riskPercent: 78,
    trend: 'rising',
    intervention: { type: 'Is yuku duzenleme', status: 'proposed' },
    jdrGap: 18,
    weeklyScores: [60, 65, 72, 78],
  },
  {
    id: '3',
    name: 'Ahmet Yilmaz',
    department: 'Muhendislik',
    riskPercent: 68,
    trend: 'rising',
    intervention: { type: '', status: 'none' },
    jdrGap: 15,
    weeklyScores: [50, 55, 62, 68],
  },
  {
    id: '4',
    name: 'Selin Dogan',
    department: 'Satis',
    riskPercent: 65,
    trend: 'stable',
    intervention: { type: '', status: 'none' },
    jdrGap: 12,
    weeklyScores: [62, 64, 65, 65],
  },
  {
    id: '5',
    name: 'Emre Cetin',
    department: 'Musteri Hizmetleri',
    riskPercent: 62,
    trend: 'falling',
    intervention: { type: 'Otonomi artirma', status: 'active' },
    jdrGap: 10,
    weeklyScores: [70, 68, 65, 62],
  },
];

const mapApiToEmployees = (
  critical: ApiCriticalEmployee[],
  jdr?: Array<{ department_name: string; demands: number; resources: number }>,
): CriticalEmployee[] => {
  return critical.slice(0, 5).map((emp, idx) => {
    const deptJdr = jdr?.find((j) => j.department_name === emp.department_name);
    const jdrGap = deptJdr ? Math.max(0, deptJdr.demands - deptJdr.resources) : 10 + idx * 3;
    const riskPercent = Math.round(emp.score);
    return {
      id: String(emp.id),
      name: `${emp.ad} ${emp.soyad}`,
      department: emp.department_name,
      riskPercent,
      trend: riskPercent >= 70 ? 'rising' : riskPercent >= 55 ? 'stable' : 'falling',
      intervention: { type: '', status: 'none' as const },
      jdrGap,
      weeklyScores: [
        Math.max(10, riskPercent - 15),
        Math.max(10, riskPercent - 10),
        Math.max(10, riskPercent - 5),
        riskPercent,
      ],
    };
  });
};

const trendConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  rising: {
    icon: <ArrowUpRight className="h-3.5 w-3.5" />,
    label: 'Yukseliyor',
    color: 'text-[#DC2626]',
  },
  stable: {
    icon: <Minus className="h-3.5 w-3.5" />,
    label: 'Sabit',
    color: 'text-[#D97706]',
  },
  falling: {
    icon: <ArrowRight className="h-3.5 w-3.5 -rotate-45" />,
    label: 'Azaliyor',
    color: 'text-[#059669]',
  },
};

const interventionStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Aktif', bg: 'bg-[#EEF0FD]', text: 'text-[#5E5CE6]' },
  proposed: { label: 'Onerilen', bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]' },
  none: { label: '', bg: '', text: '' },
};

const getRiskBarColor = (percent: number): string => {
  if (percent >= 70) return 'bg-[#DC2626]';
  if (percent >= 55) return 'bg-[#EA580C]';
  if (percent >= 40) return 'bg-[#D97706]';
  return 'bg-[#059669]';
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase();
};

/* ─── Mini Sparkline ─── */

const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 48;
  const h = 16;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const CriticalEmployees = ({ apiData }: CriticalEmployeesProps) => {
  const initialEmployees = apiData?.critical && apiData.critical.length > 0
    ? mapApiToEmployees(apiData.critical, apiData.jdr)
    : fallbackEmployees;

  const [coached, setCoached] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCoach = (id: string) => {
    setCoached((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const activeInterventionCount = initialEmployees.filter(
    (e) => e.intervention.status !== 'none',
  ).length;

  return (
    <div className="rounded-lg border border-[#EDEDED] bg-white">
      <div className="flex items-center justify-between border-b border-[#EDEDED] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#0A0A0A]">
            Kritik Risk Grubu
          </h2>
          <p className="mt-0.5 text-xs text-[#A3A3A3]">
            En yuksek tukenmislik riskine sahip 5 calisan
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeInterventionCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF0FD] px-2.5 py-1 text-[11px] font-medium text-[#5E5CE6]">
              <Activity className="h-3 w-3" />
              {activeInterventionCount} aktif mudahale
            </span>
          )}
          <span className="text-xs text-[#A3A3A3]">
            {coached.size > 0 ? `${coached.size} kocluk onerildi` : ''}
          </span>
        </div>
      </div>

      <div className="divide-y divide-[#EDEDED]">
        {initialEmployees.map((emp, idx) => {
          const trend = trendConfig[emp.trend] ?? { icon: null, label: '', color: 'text-[#888]' };
          const isCoached = coached.has(emp.id);
          const isExpanded = expandedId === emp.id;
          const intConfig = interventionStatusConfig[emp.intervention.status] ?? { label: '', bg: '', text: '' };

          return (
            <div key={emp.id}>
              <div
                className="flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#FAFAFA]"
                onClick={() => setExpandedId(isExpanded ? null : emp.id)}
              >
                {/* Rank */}
                <span className="w-5 text-center text-xs font-medium tabular-nums text-[#A3A3A3]">
                  {idx + 1}
                </span>

                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-xs font-medium text-[#525252]">
                  {getInitials(emp.name)}
                </div>

                {/* Name + dept */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#0A0A0A]">
                    {emp.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-[#A3A3A3]">{emp.department}</p>
                    {emp.intervention.status !== 'none' && (
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${intConfig.bg} ${intConfig.text}`}
                      >
                        {intConfig.label}: {emp.intervention.type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Weekly sparkline */}
                <div className="hidden sm:block">
                  <MiniSparkline
                    data={emp.weeklyScores}
                    color={emp.trend === 'rising' ? '#DC2626' : emp.trend === 'falling' ? '#059669' : '#D97706'}
                  />
                </div>

                {/* Risk bar */}
                <div className="hidden w-24 sm:block">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                    <div
                      className={`h-full rounded-full transition-all ${getRiskBarColor(emp.riskPercent)}`}
                      style={{ width: `${emp.riskPercent}%` }}
                    />
                  </div>
                </div>

                {/* Risk percent */}
                <span className="w-10 text-right text-sm font-semibold tabular-nums text-[#0A0A0A]">
                  %{emp.riskPercent}
                </span>

                {/* Trend */}
                <div className={`flex items-center gap-1 ${trend.color}`}>
                  {trend.icon}
                  <span className="hidden text-xs font-medium sm:inline">
                    {trend.label}
                  </span>
                </div>

                {/* CTA */}
                {isCoached ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#D1FAE5] px-3 py-1.5 text-xs font-medium text-[#059669]">
                    <Check className="h-3.5 w-3.5" />
                    Onerildi
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCoach(emp.id);
                    }}
                    className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-[#5E5CE6] transition-colors hover:bg-[#EEF0FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E5CE6]"
                  >
                    Kocluk Oner
                  </button>
                )}
              </div>

              {/* Expanded detail row */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="mx-5 mb-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* JD-R Gap */}
                    <div>
                      <p className="text-[11px] font-medium text-[#A3A3A3]">JD-R Gap</p>
                      <p className={`text-lg font-bold tabular-nums ${emp.jdrGap > 15 ? 'text-[#DC2626]' : emp.jdrGap > 8 ? 'text-[#D97706]' : 'text-[#059669]'}`}>
                        +{emp.jdrGap}
                      </p>
                      <p className="text-[10px] text-[#A3A3A3]">talep &gt; kaynak</p>
                    </div>

                    {/* Trend */}
                    <div>
                      <p className="text-[11px] font-medium text-[#A3A3A3]">4 Haftalik Seyir</p>
                      <div className="flex items-center gap-2">
                        {emp.weeklyScores.map((s, i) => (
                          <span key={i} className="text-xs tabular-nums text-[#525252]">
                            {i > 0 && <span className="text-[#A3A3A3]"> → </span>}
                            %{s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Intervention status */}
                    <div>
                      <p className="text-[11px] font-medium text-[#A3A3A3]">Mudahale</p>
                      {emp.intervention.status === 'none' ? (
                        <p className="text-xs text-[#A3A3A3]">Mudahale yok</p>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {emp.intervention.status === 'active' && (
                            <Clock className="h-3 w-3 text-[#5E5CE6]" />
                          )}
                          <span className="text-xs font-medium text-[#525252]">
                            {emp.intervention.type}
                          </span>
                          <span className={`text-[10px] font-semibold ${intConfig.text}`}>
                            ({intConfig.label})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
