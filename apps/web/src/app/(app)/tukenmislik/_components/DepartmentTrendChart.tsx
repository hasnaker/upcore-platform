'use client';

import { useState } from 'react';

/* ─── Types ─── */

interface DeptTrend {
  name: string;
  color: string;
  data: number[];
}

interface HeatmapRow {
  department_name: string;
  week_start: string;
  avg_score: number;
  respondent_count: number;
}

interface DepartmentTrendChartProps {
  apiData?: {
    heatmap?: HeatmapRow[];
  } | null;
}

/* ─── Color palette for departments ─── */
const DEPT_COLORS: Record<string, string> = {
  'Satis': '#DC2626',
  'Musteri Hizmetleri': '#EA580C',
  'Urun': '#D97706',
  'IK': '#5E5CE6',
  'Muhendislik': '#059669',
  'Pazarlama': '#10B981',
  'Insan Kaynaklari': '#5E5CE6',
  'Teknoloji': '#059669',
  'Genel Mudurluk': '#0A0A0A',
};

const fallbackDepartments: DeptTrend[] = [
  { name: 'Satis', color: '#DC2626', data: [38, 44, 49, 52] },
  { name: 'Musteri Hizmetleri', color: '#EA580C', data: [35, 40, 43, 47] },
  { name: 'Urun', color: '#D97706', data: [22, 30, 35, 38] },
  { name: 'IK', color: '#5E5CE6', data: [36, 30, 26, 24] },
  { name: 'Muhendislik', color: '#059669', data: [18, 17, 21, 19] },
  { name: 'Pazarlama', color: '#10B981', data: [14, 16, 13, 15] },
];

const buildTrendsFromApi = (heatmap: HeatmapRow[]): DeptTrend[] => {
  const grouped: Record<string, { week: string; score: number }[]> = {};
  for (const row of heatmap) {
    if (!grouped[row.department_name]) grouped[row.department_name] = [];
    const arr = grouped[row.department_name];
    if (arr) arr.push({ week: row.week_start, score: row.avg_score });
  }

  const colorKeys = Object.keys(DEPT_COLORS);
  let colorIdx = 0;

  return Object.entries(grouped).map(([name, rows]) => {
    const sorted = [...rows].sort((a, b) => a.week.localeCompare(b.week));
    const data = sorted.map((r) => Math.round(r.score));
    const color = DEPT_COLORS[name] ?? colorKeys[colorIdx++ % colorKeys.length] ?? '#888888';
    return { name, color, data };
  });
};

/* ─── Chart SVG ─── */

const chartW = 500;
const chartH = 180;
const padL = 36;
const padR = 16;
const padT = 10;
const padB = 24;
const plotW = chartW - padL - padR;
const plotH = chartH - padT - padB;

const TrendChart = ({ depts, highlighted, weekLabels }: { depts: DeptTrend[]; highlighted: string | null; weekLabels: string[] }) => {
  const allValues = depts.flatMap((d) => d.data);
  const maxVal = Math.max(...allValues, 60);
  const minVal = 0;
  const range = maxVal - minVal;

  const dataLen = depts[0]?.data.length ?? 4;
  const toX = (i: number) => padL + (i / (dataLen - 1)) * plotW;
  const toY = (v: number) => padT + plotH - ((v - minVal) / range) * plotH;

  // Y axis gridlines
  const gridLines = [0, 20, 40, 60];

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxWidth: chartW }}>
      {/* Grid lines */}
      {gridLines.map((v) => (
        <g key={v}>
          <line
            x1={padL}
            x2={chartW - padR}
            y1={toY(v)}
            y2={toY(v)}
            stroke="#EDEDED"
            strokeWidth="1"
          />
          <text
            x={padL - 6}
            y={toY(v) + 3}
            textAnchor="end"
            fontSize="10"
            fill="#A3A3A3"
            fontFamily="Inter, sans-serif"
          >
            {v}
          </text>
        </g>
      ))}

      {/* X axis labels */}
      {weekLabels.map((label, i) => (
        <text
          key={label}
          x={toX(i)}
          y={chartH - 4}
          textAnchor="middle"
          fontSize="10"
          fill="#A3A3A3"
          fontFamily="Inter, sans-serif"
        >
          {label}
        </text>
      ))}

      {/* Lines */}
      {depts.map((dept) => {
        const isHighlighted = highlighted === null || highlighted === dept.name;
        const points = dept.data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
        return (
          <g key={dept.name}>
            <polyline
              points={points}
              fill="none"
              stroke={dept.color}
              strokeWidth={highlighted === dept.name ? 2.5 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={isHighlighted ? 1 : 0.2}
            />
            {/* Dots */}
            {dept.data.map((v, i) => (
              <circle
                key={i}
                cx={toX(i)}
                cy={toY(v)}
                r={highlighted === dept.name ? 4 : 2.5}
                fill={dept.color}
                opacity={isHighlighted ? 1 : 0.2}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

/* ─── Main Component ─── */

export const DepartmentTrendChart = ({ apiData }: DepartmentTrendChartProps) => {
  const departments = apiData?.heatmap && apiData.heatmap.length > 0
    ? buildTrendsFromApi(apiData.heatmap)
    : fallbackDepartments;

  const weekLabels = departments[0]?.data
    ? departments[0].data.map((_, i) => `Hafta ${i + 1}`)
    : ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'];

  const [highlighted, setHighlighted] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-[#EDEDED] bg-white">
      <div className="border-b border-[#EDEDED] px-5 py-4">
        <h2 className="text-base font-semibold text-[#0A0A0A]">
          Departman Tukenmislik Trendi
        </h2>
        <p className="mt-0.5 text-xs text-[#A3A3A3]">
          Son 4 haftalik BAT-12-TR ortalama degisim grafigi
        </p>
      </div>

      <div className="px-5 py-4">
        <TrendChart depts={departments} highlighted={highlighted} weekLabels={weekLabels} />
      </div>

      {/* Legend with hover */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[#EDEDED] px-5 py-3">
        {departments.map((dept) => (
          <button
            key={dept.name}
            type="button"
            onMouseEnter={() => setHighlighted(dept.name)}
            onMouseLeave={() => setHighlighted(null)}
            onClick={() => setHighlighted((prev) => (prev === dept.name ? null : dept.name))}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
              highlighted === dept.name
                ? 'border-[#5E5CE6] bg-[#EEF0FD] text-[#5E5CE6]'
                : highlighted === null
                  ? 'border-[#EDEDED] text-[#525252] hover:border-[#D4D4D4]'
                  : 'border-[#EDEDED] text-[#D4D4D4]'
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: dept.color }}
            />
            {dept.name}
            <span className="tabular-nums text-[#888]">%{dept.data[dept.data.length - 1]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
