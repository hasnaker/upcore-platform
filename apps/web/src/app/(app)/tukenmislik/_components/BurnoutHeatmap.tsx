'use client';

import { useState } from 'react';
import {
  X,
  AlertTriangle,
  ArrowUpRight,
  Minus,
  ArrowRight,
  TrendingUp,
  Download,
  ChevronRight,
} from 'lucide-react';

/* ─── Types ─── */

interface HeatmapCell {
  score: number;
  level: 'green' | 'yellow' | 'orange' | 'red';
  employeeCount: number;
}

interface RiskEmployee {
  name: string;
  score: number;
  trend: 'rising' | 'stable' | 'falling';
}

interface SubscaleBreakdown {
  label: string;
  score: number;
  max: number;
}

interface DepartmentJDR {
  demands: number;
  resources: number;
  demandLabels: string[];
  resourceLabels: string[];
}

interface InterventionEntry {
  employee: string;
  type: string;
  status: 'devam-ediyor' | 'tamamlandi' | 'onerilen';
}

interface DepartmentRow {
  name: string;
  weeks: HeatmapCell[];
  current: number;
  monthlyTrend: number[];
  riskEmployees: RiskEmployee[];
  subscaleBreakdown: SubscaleBreakdown[];
  jdr: DepartmentJDR;
  interventions: InterventionEntry[];
}

/* ─── API Types ─── */

interface HeatmapApiRow {
  department_name: string;
  week_start: string;
  avg_score: number;
  respondent_count: number;
}

interface JdrApiRow {
  department_name: string;
  demands: number;
  resources: number;
}

interface CriticalApiRow {
  id: number;
  ad: string;
  soyad: string;
  department_name: string;
  score: number;
}

interface BurnoutApiData {
  heatmap?: HeatmapApiRow[];
  critical?: CriticalApiRow[];
  jdr?: JdrApiRow[];
  stats?: { avg_total: number; red_count: number; total_employees: number };
}

interface BurnoutHeatmapProps {
  apiData?: BurnoutApiData | null;
}

const getLevel = (score: number): 'green' | 'yellow' | 'orange' | 'red' => {
  if (score >= 55) return 'red';
  if (score >= 45) return 'orange';
  if (score >= 30) return 'yellow';
  return 'green';
};

const buildHeatmapFromApi = (apiData: BurnoutApiData): DepartmentRow[] => {
  const { heatmap = [], critical = [], jdr = [] } = apiData;

  // Group heatmap by department
  const grouped: Record<string, HeatmapApiRow[]> = {};
  for (const row of heatmap) {
    if (!grouped[row.department_name]) grouped[row.department_name] = [];
    const arr = grouped[row.department_name];
    if (arr) arr.push(row);
  }

  return Object.entries(grouped).map(([name, rows]) => {
    const sorted = [...rows].sort((a, b) => a.week_start.localeCompare(b.week_start));
    const weeks: HeatmapCell[] = sorted.map((r) => ({
      score: Math.round(r.avg_score),
      level: getLevel(r.avg_score),
      employeeCount: r.respondent_count,
    }));

    const current = weeks.length > 0 ? (weeks[weeks.length - 1]?.score ?? 0) : 0;

    // Build monthly trend from weekly scores (repeat each week ~7 times for 30 data points)
    const monthlyTrend: number[] = [];
    for (const w of weeks) {
      for (let i = 0; i < 7; i++) monthlyTrend.push(w.score);
    }
    while (monthlyTrend.length < 30) monthlyTrend.push(current);
    const trimmedTrend = monthlyTrend.slice(0, 30);

    // Department risk employees from critical list
    const deptCritical = critical
      .filter((c) => c.department_name === name)
      .slice(0, 3)
      .map((c) => ({
        name: `${c.ad} ${c.soyad}`,
        score: Math.round(c.score),
        trend: (c.score >= 70 ? 'rising' : c.score >= 55 ? 'stable' : 'falling') as 'rising' | 'stable' | 'falling',
      }));

    // JDR data
    const deptJdr = jdr.find((j) => j.department_name === name);
    const demands = deptJdr?.demands ?? 60;
    const resources = deptJdr?.resources ?? 60;

    return {
      name,
      current,
      weeks,
      monthlyTrend: trimmedTrend,
      riskEmployees: deptCritical.length > 0 ? deptCritical : [
        { name: 'Veri yok', score: 0, trend: 'stable' as const },
      ],
      subscaleBreakdown: [
        { label: 'Tukenmislik', score: Math.min(5, current / 13), max: 5 },
        { label: 'Zihinsel Uzaklasma', score: Math.min(5, current / 15), max: 5 },
        { label: 'Bilissel Bozulma', score: Math.min(5, current / 16), max: 5 },
        { label: 'Duygusal Bozulma', score: Math.min(5, current / 14), max: 5 },
      ],
      jdr: {
        demands,
        resources,
        demandLabels: demands > resources ? ['is yuku', 'zaman baskisi'] : ['bilissel talep'],
        resourceLabels: resources > demands ? ['ozerklik', 'destek', 'gelisim'] : ['ozerklik'],
      },
      interventions: [],
    };
  });
};

/* ─── Fallback Static Data ─── */

const fallbackHeatmapData: DepartmentRow[] = [
  {
    name: 'Satis',
    current: 52,
    weeks: [
      { score: 38, level: 'yellow', employeeCount: 12 },
      { score: 44, level: 'orange', employeeCount: 12 },
      { score: 49, level: 'red', employeeCount: 12 },
      { score: 52, level: 'red', employeeCount: 12 },
    ],
    monthlyTrend: [28, 32, 35, 38, 40, 42, 44, 46, 48, 49, 50, 51, 51, 52, 52, 50, 49, 50, 51, 52, 51, 52, 52, 53, 52, 52, 51, 52, 52, 52],
    riskEmployees: [
      { name: 'Burak Arslan', score: 82, trend: 'rising' },
      { name: 'Deniz Kara', score: 78, trend: 'rising' },
      { name: 'Selin Dogan', score: 65, trend: 'stable' },
    ],
    subscaleBreakdown: [
      { label: 'Tukenmislik', score: 3.8, max: 5 },
      { label: 'Zihinsel Uzaklasma', score: 3.2, max: 5 },
      { label: 'Bilissel Bozulma', score: 2.9, max: 5 },
      { label: 'Duygusal Bozulma', score: 3.1, max: 5 },
    ],
    jdr: {
      demands: 78,
      resources: 56,
      demandLabels: ['is yuku', 'zaman baskisi'],
      resourceLabels: ['ozerklik', 'destek'],
    },
    interventions: [
      { employee: 'Burak Arslan', type: 'Haftalik kocluk', status: 'devam-ediyor' },
      { employee: 'Deniz Kara', type: 'Is yuku duzenleme', status: 'onerilen' },
    ],
  },
  {
    name: 'Musteri Hizmetleri',
    current: 47,
    weeks: [
      { score: 35, level: 'yellow', employeeCount: 8 },
      { score: 40, level: 'orange', employeeCount: 8 },
      { score: 43, level: 'orange', employeeCount: 8 },
      { score: 47, level: 'red', employeeCount: 8 },
    ],
    monthlyTrend: [25, 28, 30, 32, 33, 35, 36, 37, 38, 39, 40, 41, 41, 42, 43, 43, 44, 44, 45, 45, 46, 46, 46, 47, 47, 47, 47, 47, 47, 47],
    riskEmployees: [
      { name: 'Emre Cetin', score: 62, trend: 'falling' },
      { name: 'Zeynep Koc', score: 58, trend: 'rising' },
      { name: 'Ali Demir', score: 55, trend: 'stable' },
    ],
    subscaleBreakdown: [
      { label: 'Tukenmislik', score: 3.4, max: 5 },
      { label: 'Zihinsel Uzaklasma', score: 3.0, max: 5 },
      { label: 'Bilissel Bozulma', score: 2.7, max: 5 },
      { label: 'Duygusal Bozulma', score: 3.3, max: 5 },
    ],
    jdr: {
      demands: 72,
      resources: 48,
      demandLabels: ['duygusal talep', 'zaman baskisi'],
      resourceLabels: ['sosyal destek', 'geri bildirim'],
    },
    interventions: [
      { employee: 'Emre Cetin', type: 'Otonomi artirma', status: 'devam-ediyor' },
    ],
  },
  {
    name: 'Urun',
    current: 38,
    weeks: [
      { score: 22, level: 'green', employeeCount: 6 },
      { score: 30, level: 'yellow', employeeCount: 6 },
      { score: 35, level: 'orange', employeeCount: 6 },
      { score: 38, level: 'orange', employeeCount: 6 },
    ],
    monthlyTrend: [18, 19, 20, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 34, 35, 35, 36, 36, 37, 37, 37, 38, 38, 38, 38, 38, 38, 38],
    riskEmployees: [
      { name: 'Canan Yilmaz', score: 48, trend: 'rising' },
      { name: 'Murat Oz', score: 42, trend: 'stable' },
      { name: 'Elif Sen', score: 38, trend: 'falling' },
    ],
    subscaleBreakdown: [
      { label: 'Tukenmislik', score: 2.6, max: 5 },
      { label: 'Zihinsel Uzaklasma', score: 2.3, max: 5 },
      { label: 'Bilissel Bozulma', score: 2.8, max: 5 },
      { label: 'Duygusal Bozulma', score: 2.1, max: 5 },
    ],
    jdr: {
      demands: 65,
      resources: 60,
      demandLabels: ['bilissel talep', 'is yuku'],
      resourceLabels: ['ozerklik', 'gelisim firsati'],
    },
    interventions: [],
  },
  {
    name: 'Muhendislik',
    current: 19,
    weeks: [
      { score: 18, level: 'green', employeeCount: 18 },
      { score: 17, level: 'green', employeeCount: 18 },
      { score: 21, level: 'yellow', employeeCount: 18 },
      { score: 19, level: 'green', employeeCount: 18 },
    ],
    monthlyTrend: [20, 19, 18, 18, 17, 17, 18, 18, 19, 20, 21, 21, 20, 19, 19, 18, 18, 19, 19, 20, 20, 19, 19, 19, 18, 19, 19, 19, 19, 19],
    riskEmployees: [
      { name: 'Ahmet Yilmaz', score: 68, trend: 'rising' },
      { name: 'Berk Sahin', score: 32, trend: 'stable' },
      { name: 'Ece Acar', score: 28, trend: 'falling' },
    ],
    subscaleBreakdown: [
      { label: 'Tukenmislik', score: 1.8, max: 5 },
      { label: 'Zihinsel Uzaklasma', score: 1.5, max: 5 },
      { label: 'Bilissel Bozulma', score: 1.6, max: 5 },
      { label: 'Duygusal Bozulma', score: 1.4, max: 5 },
    ],
    jdr: {
      demands: 55,
      resources: 72,
      demandLabels: ['bilissel talep', 'rol belirsizligi'],
      resourceLabels: ['ozerklik', 'beceri cesitliligi'],
    },
    interventions: [],
  },
  {
    name: 'Pazarlama',
    current: 15,
    weeks: [
      { score: 14, level: 'green', employeeCount: 8 },
      { score: 16, level: 'green', employeeCount: 8 },
      { score: 13, level: 'green', employeeCount: 8 },
      { score: 15, level: 'green', employeeCount: 8 },
    ],
    monthlyTrend: [15, 14, 14, 14, 15, 16, 16, 15, 14, 13, 13, 14, 14, 15, 15, 15, 14, 14, 15, 15, 16, 15, 14, 14, 15, 15, 15, 15, 15, 15],
    riskEmployees: [
      { name: 'Oya Derin', score: 24, trend: 'stable' },
      { name: 'Kagan Tas', score: 18, trend: 'falling' },
      { name: 'Naz Kaya', score: 15, trend: 'stable' },
    ],
    subscaleBreakdown: [
      { label: 'Tukenmislik', score: 1.4, max: 5 },
      { label: 'Zihinsel Uzaklasma', score: 1.3, max: 5 },
      { label: 'Bilissel Bozulma', score: 1.2, max: 5 },
      { label: 'Duygusal Bozulma', score: 1.1, max: 5 },
    ],
    jdr: {
      demands: 42,
      resources: 68,
      demandLabels: ['zaman baskisi'],
      resourceLabels: ['ozerklik', 'sosyal destek', 'gelisim'],
    },
    interventions: [],
  },
  {
    name: 'IK',
    current: 24,
    weeks: [
      { score: 36, level: 'orange', employeeCount: 5 },
      { score: 30, level: 'yellow', employeeCount: 5 },
      { score: 26, level: 'green', employeeCount: 5 },
      { score: 24, level: 'green', employeeCount: 5 },
    ],
    monthlyTrend: [38, 37, 36, 36, 35, 34, 33, 32, 31, 30, 30, 29, 28, 28, 27, 27, 26, 26, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24],
    riskEmployees: [
      { name: 'Ayse Korkmaz', score: 35, trend: 'falling' },
      { name: 'Mert Aydin', score: 28, trend: 'falling' },
      { name: 'Nur Tekin', score: 22, trend: 'stable' },
    ],
    subscaleBreakdown: [
      { label: 'Tukenmislik', score: 2.0, max: 5 },
      { label: 'Zihinsel Uzaklasma', score: 1.8, max: 5 },
      { label: 'Bilissel Bozulma', score: 1.7, max: 5 },
      { label: 'Duygusal Bozulma', score: 1.9, max: 5 },
    ],
    jdr: {
      demands: 48,
      resources: 70,
      demandLabels: ['duygusal talep', 'rol catismasi'],
      resourceLabels: ['sosyal destek', 'geri bildirim', 'ozerklik'],
    },
    interventions: [
      { employee: 'Ayse Korkmaz', type: 'Is yuku gozden gecirme', status: 'tamamlandi' },
    ],
  },
];

const weekLabels = ['Hf 1', 'Hf 2', 'Hf 3', 'Hf 4'];

const levelColors: Record<string, string> = {
  green: 'bg-[#D1FAE5]',
  yellow: 'bg-[#FEF3C7]',
  orange: 'bg-[#FED7AA]',
  red: 'bg-[#FEE2E2]',
};

const levelTextColors: Record<string, string> = {
  green: 'text-[#059669]',
  yellow: 'text-[#D97706]',
  orange: 'text-[#EA580C]',
  red: 'text-[#DC2626]',
};

const trendIcon: Record<string, { icon: React.ReactNode; color: string }> = {
  rising: { icon: <ArrowUpRight className="h-3 w-3" />, color: 'text-[#DC2626]' },
  stable: { icon: <Minus className="h-3 w-3" />, color: 'text-[#D97706]' },
  falling: { icon: <ArrowRight className="h-3 w-3 -rotate-45" />, color: 'text-[#059669]' },
};

const interventionStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  'devam-ediyor': { label: 'Devam Ediyor', bg: 'bg-[#EEF0FD]', text: 'text-[#5E5CE6]' },
  tamamlandi: { label: 'Tamamlandi', bg: 'bg-[#D1FAE5]', text: 'text-[#059669]' },
  onerilen: { label: 'Onerilen', bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]' },
};

/* ─── Mini Trend Line ─── */

const TrendLine = ({ data, height = 40, width = 220 }: { data: number[]; height?: number; width?: number }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  // Area fill
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="block">
      <polygon points={areaPoints} fill="#5E5CE6" opacity="0.08" />
      <polyline
        points={points}
        fill="none"
        stroke="#5E5CE6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ─── JD-R Bar ─── */

const JDRBar = ({
  label,
  value,
  labels,
  color,
  _balanceStatus,
}: {
  label: string;
  value: number;
  labels: string[];
  color: string;
  _balanceStatus?: string;
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#525252]">{label}</span>
        <span className="text-[12px] font-semibold tabular-nums text-[#0A0A0A]">%{value}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[10px] text-[#A3A3A3]">
        ({labels.join(', ')})
      </p>
    </div>
  );
};

/* ─── Main Component ─── */

export const BurnoutHeatmap = ({ apiData }: BurnoutHeatmapProps) => {
  const heatmapData = apiData?.heatmap && apiData.heatmap.length > 0
    ? buildHeatmapFromApi(apiData)
    : fallbackHeatmapData;

  const [hoveredCell, setHoveredCell] = useState<{
    dept: string;
    week: number;
    cell: HeatmapCell;
    rect: { x: number; y: number };
  } | null>(null);

  const [selectedCell, setSelectedCell] = useState<{
    dept: DepartmentRow;
    weekIdx: number;
  } | null>(null);

  const [exportClicked, setExportClicked] = useState(false);

  const handleCellClick = (dept: DepartmentRow, weekIdx: number) => {
    setSelectedCell({ dept, weekIdx });
  };

  const handleExport = () => {
    setExportClicked(true);
    // Simulate PDF generation
    setTimeout(() => setExportClicked(false), 2000);
  };

  const getJDRBalance = (dept: DepartmentRow): { label: string; color: string; textColor: string } => {
    const gap = dept.jdr.demands - dept.jdr.resources;
    if (gap > 15) return { label: 'BOZUK', color: '#DC2626', textColor: 'text-[#DC2626]' };
    if (gap > 5) return { label: 'RISKLI', color: '#D97706', textColor: 'text-[#D97706]' };
    return { label: 'DENGELI', color: '#059669', textColor: 'text-[#059669]' };
  };

  return (
    <div className="rounded-lg border border-[#EDEDED] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#EDEDED] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#0A0A0A]">
            Departman Tukenmislik Isi Haritasi
          </h2>
          <p className="mt-0.5 text-xs text-[#A3A3A3]">
            Son 4 haftalik BAT-12-TR ortalamalari · Hucrelere tiklayarak detay gorun
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${
            exportClicked
              ? 'border-[#059669] bg-[#D1FAE5] text-[#059669]'
              : 'border-[#EDEDED] text-[#555] hover:border-[#D4D4D4] hover:bg-[#FAFAFA]'
          }`}
        >
          <Download className="h-3.5 w-3.5" />
          {exportClicked ? 'Indirildi!' : 'PDF Rapor Indir'}
        </button>
      </div>

      {/* Heatmap table */}
      <div className="overflow-x-auto px-5 py-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                Departman
              </th>
              {weekLabels.map((label) => (
                <th
                  key={label}
                  className="pb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]"
                  style={{ minWidth: 80 }}
                >
                  {label}
                </th>
              ))}
              <th className="pb-3 pl-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                Guncel
              </th>
              <th className="pb-3 pl-4 text-center text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                JD-R
              </th>
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((dept) => {
              const balance = getJDRBalance(dept);
              return (
                <tr key={dept.name}>
                  <td className="py-1.5 pr-4">
                    <button
                      type="button"
                      onClick={() => handleCellClick(dept, 3)}
                      className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A] transition-colors hover:text-[#5E5CE6]"
                    >
                      {dept.name}
                      <ChevronRight className="h-3 w-3 text-[#A3A3A3]" />
                    </button>
                  </td>
                  {dept.weeks.map((cell, weekIdx) => (
                    <td key={weekIdx} className="px-1 py-1.5">
                      <button
                        type="button"
                        onClick={() => handleCellClick(dept, weekIdx)}
                        className={`relative flex h-11 w-full cursor-pointer items-center justify-center rounded-md transition-all ${levelColors[cell.level]} hover:ring-2 hover:ring-[#5E5CE6]/30 active:scale-95`}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCell({
                            dept: dept.name,
                            week: weekIdx,
                            cell,
                            rect: { x: rect.left, y: rect.top },
                          });
                        }}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <span
                          className={`text-sm font-semibold tabular-nums ${levelTextColors[cell.level]}`}
                        >
                          {cell.score}
                        </span>
                      </button>
                    </td>
                  ))}
                  <td className="py-1.5 pl-4 text-right">
                    <span className="text-sm font-semibold tabular-nums text-[#0A0A0A]">
                      %{dept.current}
                    </span>
                  </td>
                  <td className="py-1.5 pl-4 text-center">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${balance.textColor}`}
                      style={{ backgroundColor: `${balance.color}15` }}
                    >
                      {balance.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-[#EDEDED] px-5 py-3">
        <span className="text-[11px] text-[#A3A3A3]">Seviye:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#D1FAE5]" />
          <span className="text-[11px] text-[#525252]">Dusuk (0-29)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#FEF3C7]" />
          <span className="text-[11px] text-[#525252]">Orta (30-44)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#FED7AA]" />
          <span className="text-[11px] text-[#525252]">Yuksek (45-54)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#FEE2E2]" />
          <span className="text-[11px] text-[#525252]">Kritik (55+)</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-[#EDEDED] bg-white px-3 py-2 shadow-lg"
          style={{
            left: hoveredCell.rect.x,
            top: hoveredCell.rect.y - 64,
          }}
        >
          <p className="text-xs font-medium text-[#0A0A0A]">
            {hoveredCell.dept} — {weekLabels[hoveredCell.week]}
          </p>
          <p className="text-[11px] text-[#525252]">
            Skor: {hoveredCell.cell.score} · {hoveredCell.cell.employeeCount}{' '}
            calisan
          </p>
          <p className="text-[10px] text-[#5E5CE6]">Tikla: detay gor</p>
        </div>
      )}

      {/* ─── DETAIL DRAWER (overlay) ─── */}
      {selectedCell && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedCell(null)}
          />

          {/* Drawer */}
          <div
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl"
            style={{ animation: 'slideInRight 0.25s ease-out' }}
          >
            {/* Drawer header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EDEDED] bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[#0A0A0A]">
                  {selectedCell.dept.name}
                </h3>
                <p className="text-[12px] text-[#888]">
                  {weekLabels[selectedCell.weekIdx] ?? ''} · Skor: {selectedCell.dept.weeks[selectedCell.weekIdx]?.score ?? 0} · {selectedCell.dept.weeks[selectedCell.weekIdx]?.employeeCount ?? 0} calisan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#888] transition-colors hover:border-[#D4D4D4] hover:text-[#0A0A0A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-6 p-6">
              {/* Average BAT-12 score */}
              <div className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">
                  Ortalama BAT-12 Skoru
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-[#0A0A0A]">
                  {((selectedCell.dept.weeks[selectedCell.weekIdx]?.score ?? 0) / 20).toFixed(2)}
                </p>
                <p className="text-xs text-[#888]">/ 5.00</p>
              </div>

              {/* Subscale breakdown (4 bars) */}
              <div>
                <h4 className="mb-3 text-[13px] font-semibold text-[#0A0A0A]">
                  Alt Boyut Dagilimi
                </h4>
                <div className="flex flex-col gap-3">
                  {selectedCell.dept.subscaleBreakdown.map((sub) => {
                    const pct = (sub.score / sub.max) * 100;
                    const color = sub.score >= 3.5 ? '#DC2626' : sub.score >= 2.5 ? '#D97706' : '#059669';
                    return (
                      <div key={sub.label}>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-medium text-[#525252]">{sub.label}</span>
                          <span className="font-semibold tabular-nums" style={{ color }}>
                            {sub.score.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top 3 risk employees */}
              <div>
                <h4 className="mb-3 text-[13px] font-semibold text-[#0A0A0A]">
                  En Riskli 3 Calisan
                </h4>
                <div className="rounded-lg border border-[#EDEDED]">
                  <div className="divide-y divide-[#EDEDED]">
                    {selectedCell.dept.riskEmployees.map((emp, idx) => {
                      const tc = trendIcon[emp.trend] ?? { icon: null, color: 'text-[#888]' };
                      return (
                        <div
                          key={emp.name}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[10px] font-semibold text-[#888]">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#0A0A0A]">{emp.name}</p>
                          </div>
                          <span className="text-[13px] font-semibold tabular-nums text-[#0A0A0A]">
                            %{emp.score}
                          </span>
                          <span className={tc.color}>{tc.icon}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* JD-R Balance */}
              <div>
                <h4 className="mb-3 text-[13px] font-semibold text-[#0A0A0A]">
                  JD-R Denge Analizi
                </h4>
                <div className="rounded-lg border border-[#EDEDED] p-4">
                  <JDRBar
                    label="Talepler"
                    value={selectedCell.dept.jdr.demands}
                    labels={selectedCell.dept.jdr.demandLabels}
                    color="#DC2626"
                  />
                  <div className="mt-3">
                    <JDRBar
                      label="Kaynaklar"
                      value={selectedCell.dept.jdr.resources}
                      labels={selectedCell.dept.jdr.resourceLabels}
                      color="#059669"
                    />
                  </div>

                  {/* Balance indicator */}
                  {(() => {
                    const bal = getJDRBalance(selectedCell.dept);
                    return (
                      <div className="mt-3 flex items-center gap-2 rounded-md p-2" style={{ backgroundColor: `${bal.color}10` }}>
                        <span className={`text-[12px] font-bold ${bal.textColor}`}>
                          Denge: {bal.label}
                        </span>
                        {bal.label === 'BOZUK' && (
                          <AlertTriangle className="h-3.5 w-3.5 text-[#DC2626]" />
                        )}
                        {bal.label === 'RISKLI' && (
                          <TrendingUp className="h-3.5 w-3.5 text-[#D97706]" />
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 30-day trend chart */}
              <div>
                <h4 className="mb-3 text-[13px] font-semibold text-[#0A0A0A]">
                  30 Gunluk Trend
                </h4>
                <div className="rounded-lg border border-[#EDEDED] p-4">
                  <TrendLine data={selectedCell.dept.monthlyTrend} width={340} height={60} />
                  <div className="mt-2 flex items-center justify-between text-[10px] text-[#A3A3A3]">
                    <span>30 gun once</span>
                    <span>Bugun</span>
                  </div>
                </div>
              </div>

              {/* Individual Employee Scores */}
              <div>
                <h4 className="mb-3 text-[13px] font-semibold text-[#0A0A0A]">
                  Bireysel Calisan Skorlari
                </h4>
                <div className="rounded-lg border border-[#EDEDED]">
                  <div className="divide-y divide-[#EDEDED]">
                    {(() => {
                      const deptEmployeeScores: Array<{
                        name: string;
                        bat: number;
                        trend: 'up' | 'stable' | 'down';
                        exhaustion: number;
                        exhaustionLevel: 'red' | 'yellow' | 'green';
                      }> = (() => {
                        const dname = selectedCell.dept.name;
                        const map: Record<string, Array<{ name: string; bat: number; trend: 'up' | 'stable' | 'down'; exhaustion: number; exhaustionLevel: 'red' | 'yellow' | 'green' }>> = {
                          'Satis': [
                            { name: 'Ayse Yilmaz', bat: 3.63, trend: 'up', exhaustion: 4.0, exhaustionLevel: 'red' },
                            { name: 'Mehmet Kaya', bat: 2.91, trend: 'stable', exhaustion: 3.2, exhaustionLevel: 'yellow' },
                            { name: 'Burak Arslan', bat: 3.82, trend: 'up', exhaustion: 4.1, exhaustionLevel: 'red' },
                            { name: 'Deniz Kara', bat: 3.41, trend: 'up', exhaustion: 3.8, exhaustionLevel: 'red' },
                            { name: 'Selin Dogan', bat: 2.45, trend: 'stable', exhaustion: 2.6, exhaustionLevel: 'yellow' },
                          ],
                          'Musteri Hizmetleri': [
                            { name: 'Emre Cetin', bat: 2.82, trend: 'down', exhaustion: 3.0, exhaustionLevel: 'yellow' },
                            { name: 'Zeynep Koc', bat: 3.15, trend: 'up', exhaustion: 3.5, exhaustionLevel: 'red' },
                            { name: 'Ali Demir', bat: 2.71, trend: 'stable', exhaustion: 2.9, exhaustionLevel: 'yellow' },
                          ],
                          'Urun': [
                            { name: 'Canan Yilmaz', bat: 2.60, trend: 'up', exhaustion: 2.8, exhaustionLevel: 'yellow' },
                            { name: 'Murat Oz', bat: 2.20, trend: 'stable', exhaustion: 2.3, exhaustionLevel: 'green' },
                            { name: 'Elif Sen', bat: 1.85, trend: 'down', exhaustion: 1.9, exhaustionLevel: 'green' },
                          ],
                          'Muhendislik': [
                            { name: 'Ahmet Yilmaz', bat: 2.95, trend: 'up', exhaustion: 3.1, exhaustionLevel: 'yellow' },
                            { name: 'Berk Sahin', bat: 1.55, trend: 'stable', exhaustion: 1.6, exhaustionLevel: 'green' },
                            { name: 'Ece Acar', bat: 1.32, trend: 'down', exhaustion: 1.4, exhaustionLevel: 'green' },
                          ],
                          'IK': [
                            { name: 'Ayse Korkmaz', bat: 2.10, trend: 'down', exhaustion: 2.2, exhaustionLevel: 'green' },
                            { name: 'Mert Aydin', bat: 1.72, trend: 'down', exhaustion: 1.8, exhaustionLevel: 'green' },
                            { name: 'Nur Tekin', bat: 1.40, trend: 'stable', exhaustion: 1.5, exhaustionLevel: 'green' },
                          ],
                          'Pazarlama': [
                            { name: 'Oya Derin', bat: 1.55, trend: 'stable', exhaustion: 1.6, exhaustionLevel: 'green' },
                            { name: 'Kagan Tas', bat: 1.20, trend: 'down', exhaustion: 1.3, exhaustionLevel: 'green' },
                            { name: 'Naz Kaya', bat: 1.10, trend: 'stable', exhaustion: 1.2, exhaustionLevel: 'green' },
                          ],
                        };
                        return map[dname] ?? [
                          { name: 'Calisan 1', bat: 2.50, trend: 'stable' as const, exhaustion: 2.7, exhaustionLevel: 'yellow' as const },
                          { name: 'Calisan 2', bat: 1.90, trend: 'down' as const, exhaustion: 2.0, exhaustionLevel: 'green' as const },
                        ];
                      })();
                      return deptEmployeeScores.map((emp) => {
                        const trendSymbol = emp.trend === 'up' ? '\u2191' : emp.trend === 'down' ? '\u2193' : '\u2192';
                        const trendColor = emp.trend === 'up' ? 'text-[#DC2626]' : emp.trend === 'down' ? 'text-[#059669]' : 'text-[#D97706]';
                        const exhColor = emp.exhaustionLevel === 'red' ? '#DC2626' : emp.exhaustionLevel === 'yellow' ? '#D97706' : '#059669';
                        const exhBg = emp.exhaustionLevel === 'red' ? '#FEF2F2' : emp.exhaustionLevel === 'yellow' ? '#FFFBEB' : '#F0FDF4';
                        return (
                          <div key={emp.name} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[10px] font-medium text-[#525252]">
                              {emp.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-medium text-[#0A0A0A]">{emp.name}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-medium text-[#525252]">BAT:</span>
                              <span className="text-[12px] font-semibold tabular-nums text-[#0A0A0A]">{emp.bat.toFixed(2)}</span>
                              <span className={`text-[11px] font-bold ${trendColor}`}>{trendSymbol}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#A3A3A3]">Exh:</span>
                              <span
                                className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold"
                                style={{ backgroundColor: exhBg, color: exhColor }}
                              >
                                {emp.exhaustion.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Root Cause Analysis */}
              <div>
                <h4 className="mb-3 text-[13px] font-semibold text-[#0A0A0A]">
                  Kok Neden Analizi
                </h4>
                <div className="rounded-lg border border-[#D97706]/20 bg-[#FFFBEB] p-4">
                  <p className="text-[12px] leading-relaxed text-[#525252]">
                    {(() => {
                      const dept = selectedCell.dept;
                      const topDemand = dept.jdr.demandLabels[0] ?? 'is yuku';
                      const topResource = dept.jdr.resourceLabels[0] ?? 'ozerklik';
                      const demandScore = ((dept.jdr.demands / 10)).toFixed(1);
                      const resourceScore = ((dept.jdr.resources / 10)).toFixed(1);
                      const isHighDemand = dept.jdr.demands > dept.jdr.resources;
                      return (
                        <>
                          <span className="font-semibold text-[#D97706]">Bu departmanda tukenmisligin ana sebebi: </span>
                          {isHighDemand ? (
                            <>
                              {topDemand.charAt(0).toUpperCase() + topDemand.slice(1)} ({demandScore}/10) ve Dusuk {topResource.charAt(0).toUpperCase() + topResource.slice(1)} ({resourceScore}/10).
                              JD-R modeline gore kaynak artirma mudahalesi onerilir.
                            </>
                          ) : (
                            <>
                              Dengeli JD-R profili mevcut. Kaynak skoru ({resourceScore}/10) talep skorundan ({demandScore}/10) yuksek.
                              Mevcut durumun korunmasi onerilir.
                            </>
                          )}
                        </>
                      );
                    })()}
                  </p>
                </div>
              </div>

              {/* Historical Comparison */}
              <div>
                <h4 className="mb-3 text-[13px] font-semibold text-[#0A0A0A]">
                  Tarihsel Karsilastirma
                </h4>
                <div className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                  <p className="text-[12px] leading-relaxed text-[#525252]">
                    {(() => {
                      const dept = selectedCell.dept;
                      const firstWeekScore = dept.weeks[0]?.score ?? 0;
                      const lastWeekScore = dept.weeks[dept.weeks.length - 1]?.score ?? 0;
                      const diff = lastWeekScore - firstWeekScore;
                      const firstLevel = dept.weeks[0]?.level ?? 'green';
                      const levelLabels: Record<string, string> = { green: 'YESIL', yellow: 'SARI', orange: 'TURUNCU', red: 'KIRMIZI' };
                      const reasonMap: Record<string, string> = {
                        'Satis': 'Q1 satis hedefi artisi (%40)',
                        'Musteri Hizmetleri': 'Musteriden gelen sikayet yogunlugu artisi (%25)',
                        'Urun': 'Yeni urun lansmanina bagli sprint yogunlugu',
                        'Muhendislik': 'Teknik borc temizligi baslatildi',
                        'IK': 'Ise alim yogunlugu normalize oldu',
                        'Pazarlama': 'Kampanya donemi sakin gecti',
                      };
                      if (diff > 10) {
                        return (
                          <>
                            Bu departman 3 ay once <span className="font-semibold text-[#059669]">{levelLabels[firstLevel]}</span> bolgede idi.
                            Kotulesme ana sebebi: <span className="font-semibold text-[#DC2626]">{reasonMap[dept.name] ?? 'artan is yuku'}</span>.
                            Skor {firstWeekScore} &#8594; {lastWeekScore} (+{diff} puan artis).
                          </>
                        );
                      } else if (diff < -5) {
                        return (
                          <>
                            Bu departman iyilesme trendinde.
                            Skor {firstWeekScore} &#8594; {lastWeekScore} ({diff} puan dusus).
                            Mudahalelerin etkisi goruluyor.
                          </>
                        );
                      } else {
                        return (
                          <>
                            Bu departman son 4 haftada stabil seyretti.
                            Skor {firstWeekScore} &#8594; {lastWeekScore} (degisim: {diff > 0 ? '+' : ''}{diff} puan).
                          </>
                        );
                      }
                    })()}
                  </p>
                </div>
              </div>

              {/* Active interventions */}
              <div>
                <h4 className="mb-3 text-[13px] font-semibold text-[#0A0A0A]">
                  Aktif Mudahaleler
                </h4>
                {selectedCell.dept.interventions.length === 0 ? (
                  <div className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-6 text-center">
                    <p className="text-xs text-[#A3A3A3]">
                      Bu departmanda aktif mudahale bulunmuyor.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#EDEDED]">
                    <div className="divide-y divide-[#EDEDED]">
                      {selectedCell.dept.interventions.map((int, idx) => {
                        const sc = interventionStatusConfig[int.status] ?? { label: int.status, bg: 'bg-[#F5F5F5]', text: 'text-[#888]' };
                        return (
                          <div key={idx} className="flex items-center gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-[#0A0A0A]">
                                {int.type}
                              </p>
                              <p className="text-[11px] text-[#888]">{int.employee}</p>
                            </div>
                            <span
                              className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ${sc.bg} ${sc.text}`}
                            >
                              {sc.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Inline animation styles */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
