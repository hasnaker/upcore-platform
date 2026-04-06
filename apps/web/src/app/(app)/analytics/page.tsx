'use client';

import React, { useState, useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────
 * Workforce Analytics Dashboard — /analytics
 * 4 Tabs: Genel | Tükenmişlik | İşe Alım | İzin
 * All charts: pure CSS/SVG. No external chart library.
 * All data: static, realistic, Turkish — clearly marked.
 * ───────────────────────────────────────────────────────────── */

type AnalyticsTab = 'genel' | 'tukenmislik' | 'ise-alim' | 'izin';

const TABS: { key: AnalyticsTab; label: string }[] = [
  { key: 'genel', label: 'Genel' },
  { key: 'tukenmislik', label: 'Tükenmişlik' },
  { key: 'ise-alim', label: 'İşe Alım' },
  { key: 'izin', label: 'İzin' },
];

/* ─── Shared Chart Components ─── */

/** SVG Line Chart */
function LineChart({ data, width = 500, height = 160, color = '#5E5CE6', labels }: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  labels?: string[];
}) {
  const padding = { top: 16, right: 16, bottom: 28, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const minVal = Math.min(...data) * 0.9;
  const maxVal = Math.max(...data) * 1.1;

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const getY = (v: number) => padding.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d).toFixed(1)}`).join(' ');
  const areaPath = linePath + ` L ${getX(data.length - 1).toFixed(1)} ${padding.top + chartH} L ${getX(0).toFixed(1)} ${padding.top + chartH} Z`;

  // Y axis labels
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => minVal + (i / ySteps) * (maxVal - minVal));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {yLabels.map((v, i) => (
        <g key={i}>
          <line x1={padding.left} y1={getY(v)} x2={width - padding.right} y2={getY(v)} stroke="#f0f0f0" strokeWidth={1} />
          <text x={padding.left - 6} y={getY(v) + 4} textAnchor="end" fill="#A3A3A3" fontSize={10}>{Math.round(v)}</text>
        </g>
      ))}
      {/* Area fill */}
      <path d={areaPath} fill={`${color}15`} />
      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Data points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(d)} r={4} fill="white" stroke={color} strokeWidth={2} />
          {labels && labels[i] && (
            <text x={getX(i)} y={padding.top + chartH + 18} textAnchor="middle" fill="#A3A3A3" fontSize={10}>{labels[i]}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** SVG Donut Chart */
function DonutChart({ segments, size = 180, strokeWidth = 28 }: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let accumulated = 0;

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:gap-8">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {segments.map((seg, i) => {
            const segLength = (seg.value / total) * circumference;
            const offset = accumulated;
            accumulated += segLength;
            const isHov = hovered === i;
            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHov ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${segLength} ${circumference - segLength}`}
                strokeDashoffset={-offset}
                style={{ transition: 'stroke-width 150ms', cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {hovered !== null ? (
            <>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>%{segments[hovered]!.value}</span>
              <span style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{segments[hovered]!.label}</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{total}</span>
              <span style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Toplam</span>
            </>
          )}
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: hovered === i ? '#111' : '#555', fontWeight: hovered === i ? 600 : 400, transition: 'all 150ms' }}>
              {seg.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#111', marginLeft: 4 }}>%{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal Bar Chart */
function HorizontalBars({ items }: { items: { label: string; value: number; max: number; color: string; suffix?: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map(item => {
        const pct = (item.value / item.max) * 100;
        return (
          <div key={item.label} className="group relative flex items-center gap-3" title={`${item.label}: ${item.value}${item.suffix || ''}`}>
            <span style={{ fontSize: 12, color: '#555', width: 120, flexShrink: 0 }}>{item.label}</span>
            <div style={{ flex: 1, height: 10, background: '#f0f0f0', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 5, transition: 'width 0.5s' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#111', width: 50, textAlign: 'right' }}>
              {item.value}{item.suffix || ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Stat Card */
function StatCard({ label, value, subtitle, color = '#5E5CE6' }: { label: string; value: string; subtitle?: string; color?: string }) {
  return (
    <div className="group relative rounded-xl border border-[#EDEDED] bg-white p-5 transition-shadow hover:shadow-sm" title={`${label}: ${value}`}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', marginTop: 4 }}>{value}</p>
      {subtitle && <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{subtitle}</p>}
      <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: color }} />
    </div>
  );
}

/** Dual Line Chart (for demands vs resources) */
function DualLineChart({ data1, data2, labels, color1 = '#DC2626', color2 = '#059669', label1 = '', label2 = '' }: {
  data1: number[];
  data2: number[];
  labels: string[];
  color1?: string;
  color2?: string;
  label1?: string;
  label2?: string;
}) {
  const width = 500;
  const height = 160;
  const padding = { top: 16, right: 16, bottom: 28, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const allData = [...data1, ...data2];
  const minVal = Math.min(...allData) * 0.85;
  const maxVal = Math.max(...allData) * 1.1;

  const getX = (i: number) => padding.left + (i / (data1.length - 1)) * chartW;
  const getY = (v: number) => padding.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const makePath = (data: number[]) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d).toFixed(1)}`).join(' ');

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Grid */}
        {[0, 1, 2, 3, 4].map(i => {
          const v = minVal + (i / 4) * (maxVal - minVal);
          return <line key={i} x1={padding.left} y1={getY(v)} x2={width - padding.right} y2={getY(v)} stroke="#f0f0f0" strokeWidth={1} />;
        })}
        {/* Lines */}
        <path d={makePath(data1)} fill="none" stroke={color1} strokeWidth={2.5} strokeLinecap="round" />
        <path d={makePath(data2)} fill="none" stroke={color2} strokeWidth={2.5} strokeLinecap="round" />
        {/* Points + labels */}
        {data1.map((_, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(data1[i]!)} r={3} fill={color1} />
            <circle cx={getX(i)} cy={getY(data2[i]!)} r={3} fill={color2} />
            {labels[i] && (
              <text x={getX(i)} y={padding.top + chartH + 18} textAnchor="middle" fill="#A3A3A3" fontSize={10}>{labels[i]}</text>
            )}
          </g>
        ))}
      </svg>
      <div className="mt-3 flex gap-6">
        <div className="flex items-center gap-2">
          <span style={{ width: 12, height: 3, borderRadius: 2, background: color1 }} />
          <span style={{ fontSize: 11, color: '#555' }}>{label1}</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 12, height: 3, borderRadius: 2, background: color2 }} />
          <span style={{ fontSize: 11, color: '#555' }}>{label2}</span>
        </div>
      </div>
    </div>
  );
}

/** Grouped Bar Chart */
function GroupedBarChart({ groups, colors, legend }: {
  groups: { label: string; values: number[] }[];
  colors: string[];
  legend: string[];
}) {
  const maxVal = Math.max(...groups.flatMap(g => g.values));

  return (
    <div>
      <div className="flex items-end gap-4" style={{ height: 130 }}>
        {groups.map((g, gi) => (
          <div key={gi} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex items-end gap-1" style={{ height: 100 }}>
              {g.values.map((v, vi) => {
                const h = (v / (maxVal * 1.2)) * 100;
                return (
                  <div
                    key={vi}
                    className="group relative"
                    style={{
                      width: 14,
                      height: `${h}%`,
                      background: colors[vi],
                      borderRadius: 3,
                      minHeight: 4,
                      transition: 'height 0.4s',
                    }}
                    title={`${g.label} — ${legend[vi]}: ${v.toFixed(2)}`}
                  >
                    <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0A0A0A] px-2 py-1 text-[9px] font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
                      {v.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
            <span style={{ fontSize: 9, color: '#888', textAlign: 'center', lineHeight: 1.2 }}>{g.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-5">
        {legend.map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[i] }} />
            <span style={{ fontSize: 10, color: '#555' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Funnel Chart */
function FunnelChart({ steps }: { steps: { label: string; value: number; color: string }[] }) {
  const maxVal = steps[0]?.value ?? 1;

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, i) => {
        const widthPct = Math.max((step.value / maxVal) * 100, 20);
        const convRate = i > 0 ? ((step.value / (steps[i - 1]?.value ?? 1)) * 100).toFixed(0) : '100';
        return (
          <div key={i} className="group relative flex items-center gap-3" title={`${step.label}: ${step.value} (dönüşüm: %${convRate})`}>
            <div style={{
              width: `${widthPct}%`,
              height: 36,
              background: step.color,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'width 0.5s',
              minWidth: 80,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{step.value}</span>
            </div>
            <div className="flex flex-col">
              <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{step.label}</span>
              {i > 0 && (
                <span style={{ fontSize: 10, color: '#888' }}>%{convRate} dönüşüm</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Pie Chart (simple) */
function PieChart({ segments, size = 160 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const center = size / 2;
  const radius = size / 2 - 4;

  let cumulativeAngle = -90;

  const slices = segments.map((seg, i) => {
    const angle = (seg.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = startAngle + angle;
    cumulativeAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const d = `M ${center} ${center} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    return { d, color: seg.color, label: seg.label, value: seg.value, index: i };
  });

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:gap-6">
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {slices.map(s => (
          <path
            key={s.index}
            d={s.d}
            fill={s.color}
            stroke="white"
            strokeWidth={2}
            style={{ cursor: 'pointer', opacity: hovered !== null && hovered !== s.index ? 0.5 : 1, transition: 'opacity 150ms' }}
            onMouseEnter={() => setHovered(s.index)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: hovered === i ? '#111' : '#555', fontWeight: hovered === i ? 600 : 400 }}>
              {seg.label}: %{((seg.value / total) * 100).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Card wrapper ─── */

function AnalyticsCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: subtitle ? 4 : 16 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>{subtitle}</p>}
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 *  TAB: GENEL
 * ═══════════════════════════════════════════════════════ */

function GenelTab() {
  // API-driven summary metrics
  const [summary, setSummary] = useState<{
    totalEmployees: number;
    criticalRisk: number;
    highRisk: number;
    avgOkrProgress: number | null;
    avgBurnout: number | null;
    nineBoxDistribution: Record<string, number>;
  } | null>(null);

  // API-driven performance trends
  const [perfTrends, setPerfTrends] = useState<Record<string, Array<{ date: string; okr: number | null; performance: number | null; risk: number | null }>> | null>(null);

  useEffect(() => {
    fetch('/api/employee-intelligence')
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) setSummary(data.summary);
      })
      .catch(() => {});

    fetch('/api/performance')
      .then((res) => res.json())
      .then((data) => {
        if (data.trends) setPerfTrends(data.trends);
      })
      .catch(() => {});
  }, []);

  // Derive OKR trend from performance trends (average OKR per week across all employees)
  const okrWeeklyAvg: number[] = [];
  const okrWeekLabels: string[] = [];
  if (perfTrends) {
    const allEmployees = Object.values(perfTrends);
    if (allEmployees.length > 0) {
      const maxLen = Math.max(...allEmployees.map((t) => t.length));
      for (let i = 0; i < maxLen; i++) {
        let sum = 0;
        let count = 0;
        for (const empTrend of allEmployees) {
          const point = empTrend[i];
          if (point?.okr !== null && point?.okr !== undefined) {
            sum += point.okr;
            count++;
          }
        }
        okrWeeklyAvg.push(count > 0 ? Math.round(sum / count) : 0);
        okrWeekLabels.push(`H${i + 1}`);
      }
    }
  }

  // Fallback static data
  const monthlyHeadcount = okrWeeklyAvg.length > 0 ? okrWeeklyAvg : [65, 66, 68, 70, 72, 70, 71, 72, 72, 73, 74, 74];
  const monthLabels = okrWeeklyAvg.length > 0 ? okrWeekLabels : ['Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara', 'Oca', 'Şub', 'Mar'];

  // Build nine-box distribution donut from API data
  const nineBoxColors: Record<string, string> = {
    star: '#059669', growth: '#5E5CE6', solid: '#D97706', average: '#A3A3A3', risk: '#DC2626',
  };
  const nineBoxLabels: Record<string, string> = {
    star: 'Yıldız', growth: 'Gelişim', solid: 'Sabit', average: 'Ortalama', risk: 'Risk',
  };
  const departmentDist = summary?.nineBoxDistribution
    ? Object.entries(summary.nineBoxDistribution)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          label: nineBoxLabels[key] ?? key,
          value,
          color: nineBoxColors[key] ?? '#888',
        }))
    : [
        { label: 'Satış', value: 34, color: '#DC2626' },
        { label: 'Mühendislik', value: 26, color: '#5E5CE6' },
        { label: 'Müşteri Hiz.', value: 14, color: '#D97706' },
        { label: 'Ürün', value: 11, color: '#059669' },
        { label: 'Pazarlama', value: 9, color: '#EA580C' },
        { label: 'İK', value: 6, color: '#2563EB' },
      ];

  // Static data — contract types (no API source for this)
  const contractTypes = [
    { label: 'Belirsiz Süreli', value: 82, max: 100, color: '#5E5CE6', suffix: '%' },
    { label: 'Belirli Süreli', value: 12, max: 100, color: '#D97706', suffix: '%' },
    { label: 'Part-time', value: 6, max: 100, color: '#A3A3A3', suffix: '%' },
  ];

  // Static data — age distribution (no API source for this)
  const ageDistribution = [
    { label: '20-30 yaş', value: 35, max: 100, color: '#5E5CE6', suffix: '%' },
    { label: '30-40 yaş', value: 42, max: 100, color: '#059669', suffix: '%' },
    { label: '40-50 yaş', value: 18, max: 100, color: '#D97706', suffix: '%' },
    { label: '50+ yaş', value: 5, max: 100, color: '#DC2626', suffix: '%' },
  ];

  // Static data — gender ratio (no API source for this)
  const genderRatio = [
    { label: 'Kadın', value: 44, color: '#5E5CE6' },
    { label: 'Erkek', value: 56, color: '#0A0A0A' },
  ];

  // Derive stat card values from API
  const totalEmployees = summary?.totalEmployees ?? 74;
  const avgOkr = summary?.avgOkrProgress !== null && summary?.avgOkrProgress !== undefined ? `%${summary.avgOkrProgress}` : '%68';
  const avgBurnout = summary?.avgBurnout !== null && summary?.avgBurnout !== undefined ? `${summary.avgBurnout}` : '2.3';
  const riskCount = summary ? (summary.criticalRisk + summary.highRisk) : 3;

  return (
    <div className="flex flex-col gap-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Toplam Çalışan" value={String(totalEmployees)} subtitle="Aktif personel" color="#5E5CE6" />
        <StatCard label="OKR İlerleme Ort." value={avgOkr} subtitle="Aktif hedefler" color="#059669" />
        <StatCard label="Tükenmişlik Ort." value={avgBurnout} subtitle="BAT skoru" color="#D97706" />
        <StatCard label="Risk Altında" value={`${riskCount} kişi`} subtitle="Kritik + Yüksek risk" color="#DC2626" />
      </div>

      {/* OKR Trend (API) or Employee Count Trend (fallback) */}
      <AnalyticsCard
        title={okrWeeklyAvg.length > 0 ? 'Haftalık OKR İlerleme Trendi' : 'Çalışan Sayısı Trendi'}
        subtitle={okrWeeklyAvg.length > 0 ? 'Tüm çalışanların ortalama OKR ilerlemesi' : 'Son 12 ay personel sayısı değişimi'}
      >
        <LineChart data={monthlyHeadcount} labels={monthLabels} color="#5E5CE6" />
        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 12 }}>
          {okrWeeklyAvg.length > 0
            ? `Ortalama OKR: %${summary?.avgOkrProgress ?? '-'} — ${totalEmployees} çalışan`
            : '+9 kişi net büyüme (son 12 ay) — %13.8 artış'}
        </div>
      </AnalyticsCard>

      {/* Two-col: Department + Contract */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsCard
          title={summary?.nineBoxDistribution ? '9-Box Dağılımı' : 'Departman Dağılımı'}
          subtitle={summary?.nineBoxDistribution ? 'Çalışan performans/potansiyel kategorileri' : 'Aktif çalışan oranı'}
        >
          <DonutChart segments={departmentDist} />
        </AnalyticsCard>

        <AnalyticsCard title="Sözleşme Tipi Dağılımı" subtitle="İş sözleşmesi türüne göre">
          <HorizontalBars items={contractTypes} />
        </AnalyticsCard>
      </div>

      {/* Two-col: Age + Gender */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsCard title="Yaş Dağılımı" subtitle="Aktif personel yaş grupları">
          <HorizontalBars items={ageDistribution} />
        </AnalyticsCard>

        <AnalyticsCard title="Cinsiyet Oranı" subtitle="Tüm çalışanlar">
          <DonutChart segments={genderRatio} size={140} strokeWidth={22} />
        </AnalyticsCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 *  TAB: TÜKENMİŞLİK
 * ═══════════════════════════════════════════════════════ */

function TukenmislikAnalyticsTab() {
  const [apiSummary, setApiSummary] = useState<{
    avgBurnout: number | null;
    criticalRisk: number;
    highRisk: number;
  } | null>(null);

  const [burnoutWeekly, setBurnoutWeekly] = useState<number[]>([]);

  useEffect(() => {
    fetch('/api/employee-intelligence')
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) setApiSummary(data.summary);
      })
      .catch(() => {});

    fetch('/api/performance')
      .then((res) => res.json())
      .then((data) => {
        if (data.trends) {
          // Derive weekly burnout averages across all employees
          const allEmployees = Object.values(data.trends) as Array<Array<{ date: string; okr: number | null; performance: number | null; risk: number | null }>>;
          if (allEmployees.length > 0) {
            const maxLen = Math.max(...allEmployees.map((t: Array<{ date: string }>) => t.length));
            const weeklyAvg: number[] = [];
            for (let i = 0; i < maxLen; i++) {
              let sum = 0;
              let count = 0;
              for (const empTrend of allEmployees) {
                const point = empTrend[i];
                if (point?.risk !== null && point?.risk !== undefined) {
                  sum += point.risk;
                  count++;
                }
              }
              weeklyAvg.push(count > 0 ? Math.round((sum / count) * 100) / 100 : 0);
            }
            setBurnoutWeekly(weeklyAvg);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Use API data or fallback
  const burnoutTrend = burnoutWeekly.length > 0 ? burnoutWeekly : [2.1, 2.15, 2.2, 2.18, 2.3, 2.28, 2.35, 2.42, 2.38, 2.45, 2.5, 2.48];
  const monthLabels = burnoutWeekly.length > 0
    ? burnoutWeekly.map((_, i) => `H${i + 1}`)
    : ['Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara', 'Oca', 'Şub', 'Mar'];

  // Static data — will be replaced with API call
  const deptComparison = [
    { label: 'Satış', values: [2.8, 3.1] },
    { label: 'Müh.', values: [2.2, 2.4] },
    { label: 'MH', values: [2.9, 2.7] },
    { label: 'Ürün', values: [1.9, 2.1] },
    { label: 'Paz.', values: [2.1, 2.3] },
    { label: 'İK', values: [1.8, 1.9] },
  ];

  // Static data — will be replaced with API call
  const demandsTrend = [6.2, 6.4, 6.5, 6.8, 7.0, 6.9, 7.1, 7.3, 7.2, 7.4, 7.5, 7.6];
  const resourcesTrend = [6.0, 5.8, 5.9, 5.7, 5.6, 5.5, 5.4, 5.3, 5.2, 5.1, 5.0, 4.9];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Şirket BAT Ortalaması"
          value={apiSummary?.avgBurnout !== null && apiSummary?.avgBurnout !== undefined ? String(apiSummary.avgBurnout) : '2.48'}
          subtitle="Güncel ortalama"
          color="#D97706"
        />
        <StatCard
          label="Yüksek Riskli"
          value={apiSummary ? `${apiSummary.criticalRisk + apiSummary.highRisk} kişi` : '5 kişi'}
          subtitle="Kritik + Yüksek risk"
          color="#DC2626"
        />
        <StatCard label="Müdahale Başarısı" value="%72" subtitle="8 müdahaleden 6'sı başarılı" color="#059669" />
        <StatCard label="Verimlilik Kaybı" value="₺1.2M/yıl" subtitle="Tükenmişlik kaynaklı tahmin" color="#DC2626" />
      </div>

      {/* 12-month burnout trend */}
      <AnalyticsCard title="12 Aylık Tükenmişlik Trendi" subtitle="Şirket geneli ortalama BAT-12 skoru">
        <LineChart data={burnoutTrend} labels={monthLabels} color="#D97706" />
        <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginTop: 12 }}>
          ↑ 12 ayda +0.38 puan artış — yükselen trend dikkat gerektiriyor
        </div>
      </AnalyticsCard>

      {/* Department comparison */}
      <AnalyticsCard title="Departman Karşılaştırması" subtitle="Geçen çeyrek vs bu çeyrek BAT ortalamaları">
        <GroupedBarChart
          groups={deptComparison}
          colors={['#A3A3A3', '#5E5CE6']}
          legend={['Geçen Çeyrek', 'Bu Çeyrek']}
        />
      </AnalyticsCard>

      {/* JD-R Evolution */}
      <AnalyticsCard title="JD-R Denge Evrimi" subtitle="İş talepleri vs kaynaklar — 12 aylık trend">
        <DualLineChart
          data1={demandsTrend}
          data2={resourcesTrend}
          labels={monthLabels}
          color1="#DC2626"
          color2="#059669"
          label1="Talepler"
          label2="Kaynaklar"
        />
        <div style={{ background: '#FEE2E2', borderRadius: 8, padding: 12, fontSize: 13, color: '#991B1B', marginTop: 16 }}>
          ⚠️ Talepler artarken kaynaklar düşüyor — makas açılıyor. Son 12 ayda fark: +1.4 → +2.7
        </div>
      </AnalyticsCard>

      {/* Intervention effectiveness */}
      <AnalyticsCard title="Müdahale Etkinliği" subtitle="Son 12 ay uygulanan aksiyonlar">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="group relative rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] p-4 text-center" title="Başarılı müdahaleler">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>6</div>
            <div style={{ fontSize: 12, color: '#065F46' }}>Başarılı</div>
          </div>
          <div className="group relative rounded-lg border border-[#FEF3C7] bg-[#FFFBEB] p-4 text-center" title="Kısmi etki gösteren müdahaleler">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#D97706' }}>1</div>
            <div style={{ fontSize: 12, color: '#92400E' }}>Kısmi Etki</div>
          </div>
          <div className="group relative rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-4 text-center" title="Etkisiz müdahaleler">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#DC2626' }}>1</div>
            <div style={{ fontSize: 12, color: '#991B1B' }}>Etkisiz</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 16 }}>
          8 müdahale yapıldı, %72 başarı oranı. En etkili: Haftalık 1:1 koçluk (-0.4 BAT düşüşü ort.)
        </div>
      </AnalyticsCard>

      {/* Cost of burnout */}
      <div style={{
        background: 'linear-gradient(135deg, #7C3AED15, #DC262615)',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        padding: 24,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 8 }}>Tükenmişliğin Maliyeti</h3>
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#DC2626' }}>₺1.2M</div>
            <div style={{ fontSize: 12, color: '#555' }}>Yıllık verimlilik kaybı tahmini</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706' }}>₺340K</div>
            <div style={{ fontSize: 12, color: '#555' }}>Ayrılma kaynaklı işe alım maliyeti</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#5E5CE6' }}>₺180K</div>
            <div style={{ fontSize: 12, color: '#555' }}>Hastalık izni ek maliyeti</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
          * Gallup & SHRM metodolojisine dayalı tahminler. Gerçek maliyet değişkenlik gösterebilir.
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 *  TAB: İŞE ALIM
 * ═══════════════════════════════════════════════════════ */

function IseAlimTab() {
  // Static data — will be replaced with API call
  const timeToHireTrend = [38, 35, 33, 30, 32, 34, 31, 29, 33, 30, 32, 32];
  const monthLabels = ['Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara', 'Oca', 'Şub', 'Mar'];

  // Static data — will be replaced with API call
  const sourceData = [
    { label: 'Kariyer.net', value: 45, max: 100, color: '#5E5CE6', suffix: '%' },
    { label: 'LinkedIn', value: 30, max: 100, color: '#2563EB', suffix: '%' },
    { label: 'Referral', value: 20, max: 100, color: '#059669', suffix: '%' },
    { label: 'Diğer', value: 5, max: 100, color: '#A3A3A3', suffix: '%' },
  ];

  // Static data — will be replaced with API call
  const funnelSteps = [
    { label: 'Başvuru', value: 100, color: '#5E5CE6' },
    { label: 'Ön Tarama', value: 40, color: '#7C3AED' },
    { label: 'Test', value: 15, color: '#D97706' },
    { label: 'Mülakat', value: 8, color: '#EA580C' },
    { label: 'Teklif', value: 3, color: '#DC2626' },
    { label: 'İşe Alım', value: 2, color: '#059669' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ort. İşe Alım Süresi" value="32 gün" subtitle="Hedef: 25 gün" color="#D97706" />
        <StatCard label="Açık Pozisyon" value="4" subtitle="Aktif ilan" color="#5E5CE6" />
        <StatCard label="Bu Ay İşe Alınan" value="2" subtitle="Mart 2026" color="#059669" />
        <StatCard label="İşe Alım Kalitesi" value="%85" subtitle="6 ay sonra hâlâ aktif" color="#059669" />
      </div>

      {/* Time to hire trend */}
      <AnalyticsCard title="İşe Alım Süresi Trendi" subtitle="Başvurudan işe başlamaya ortalama gün sayısı">
        <LineChart data={timeToHireTrend} labels={monthLabels} color="#D97706" />
        <div className="mt-3 flex items-center gap-3">
          <div style={{ height: 2, flex: 1, background: '#f0f0f0', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '62.5%', top: -6, bottom: -6, width: 2, background: '#059669', borderRadius: 1 }} />
            <span style={{ position: 'absolute', left: '62.5%', top: -18, transform: 'translateX(-50%)', fontSize: 9, color: '#059669', fontWeight: 600, whiteSpace: 'nowrap' }}>Hedef: 25 gün</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600, marginTop: 16 }}>
          Ortalama 32 gün — hedefe 7 gün mesafe
        </div>
      </AnalyticsCard>

      {/* Source effectiveness */}
      <AnalyticsCard title="Kaynak Etkinliği" subtitle="İşe alım kanallarının dağılımı">
        <HorizontalBars items={sourceData} />
        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 12 }}>
          Referral kanalı en yüksek kalite oranına sahip (%94 tutma) ama hacim düşük
        </div>
      </AnalyticsCard>

      {/* Pipeline funnel */}
      <AnalyticsCard title="İşe Alım Hunisi" subtitle="Son çeyrekte ortalama dönüşüm oranları">
        <FunnelChart steps={funnelSteps} />
        <div style={{ fontSize: 12, color: '#888', marginTop: 16 }}>
          Genel dönüşüm oranı: %2 (100 başvurudan 2 işe alım). Sektör ortalaması: %2.5
        </div>
      </AnalyticsCard>

      {/* Quality of hire */}
      <AnalyticsCard title="İşe Alım Kalitesi" subtitle="İlk yıl performans ve tutma metrikleri">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="group relative rounded-lg border border-[#EDEDED] bg-white p-4 text-center" title="6 ay sonra hâlâ çalışan">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>%85</div>
            <div style={{ fontSize: 12, color: '#555' }}>6 Ay Tutma Oranı</div>
          </div>
          <div className="group relative rounded-lg border border-[#EDEDED] bg-white p-4 text-center" title="12 ay sonra hâlâ çalışan">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#5E5CE6' }}>%72</div>
            <div style={{ fontSize: 12, color: '#555' }}>12 Ay Tutma Oranı</div>
          </div>
          <div className="group relative rounded-lg border border-[#EDEDED] bg-white p-4 text-center" title="Yönetici değerlendirmesi ortalaması">
            <div style={{ fontSize: 28, fontWeight: 800, color: '#D97706' }}>3.8/5</div>
            <div style={{ fontSize: 12, color: '#555' }}>Performans Skoru</div>
          </div>
        </div>
      </AnalyticsCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 *  TAB: İZİN
 * ═══════════════════════════════════════════════════════ */

function IzinAnalyticsTab() {
  // Static data — will be replaced with API call
  const deptLeaveUtilization = [
    { label: 'Satış', value: 72, max: 100, color: '#DC2626', suffix: '%' },
    { label: 'Mühendislik', value: 65, max: 100, color: '#5E5CE6', suffix: '%' },
    { label: 'Müşteri Hiz.', value: 78, max: 100, color: '#D97706', suffix: '%' },
    { label: 'Ürün', value: 58, max: 100, color: '#059669', suffix: '%' },
    { label: 'Pazarlama', value: 82, max: 100, color: '#EA580C', suffix: '%' },
    { label: 'İK', value: 70, max: 100, color: '#2563EB', suffix: '%' },
  ];

  // Static data — will be replaced with API call
  const absenceRateTrend = [3.2, 3.5, 3.1, 4.8, 5.2, 3.4, 3.8, 3.6, 4.1, 3.9, 3.3, 3.7];
  const monthLabels = ['Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara', 'Oca', 'Şub', 'Mar'];

  // Static data — will be replaced with API call
  const leaveTypes = [
    { label: 'Yıllık İzin', value: 52, color: '#5E5CE6' },
    { label: 'Hastalık', value: 22, color: '#DC2626' },
    { label: 'Mazeret', value: 15, color: '#D97706' },
    { label: 'Doğum/Babalık', value: 7, color: '#059669' },
    { label: 'Diğer', value: 4, color: '#A3A3A3' },
  ];

  // Static data — will be replaced with API call
  const seasonalData = [
    { month: 'Oca', days: 45 },
    { month: 'Şub', days: 38 },
    { month: 'Mar', days: 42 },
    { month: 'Nis', days: 55 },
    { month: 'May', days: 68 },
    { month: 'Haz', days: 85 },
    { month: 'Tem', days: 156 },
    { month: 'Ağu', days: 142 },
    { month: 'Eyl', days: 52 },
    { month: 'Eki', days: 48 },
    { month: 'Kas', days: 35 },
    { month: 'Ara', days: 72 },
  ];
  const maxDays = Math.max(...seasonalData.map(d => d.days));

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ort. Kullanım Oranı" value="%68" subtitle="Yıllık izin hakkından" color="#5E5CE6" />
        <StatCard label="Devamsızlık Oranı" value="%3.7" subtitle="Son ay" color="#D97706" />
        <StatCard label="Bu Ay İzinli" value="12 kişi" subtitle="Mart 2026" color="#059669" />
        <StatCard label="Kullanılmayan" value="186 gün" subtitle="Toplam birikmiş" color="#DC2626" />
      </div>

      {/* Department leave utilization */}
      <AnalyticsCard title="Departmanlara Göre İzin Kullanımı" subtitle="Yıllık izin hakkının kullanılan yüzdesi">
        <HorizontalBars items={deptLeaveUtilization} />
        <div style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
          Şirket ortalaması: %68 · Sektör ortalaması: %72
        </div>
      </AnalyticsCard>

      {/* Absence rate trend */}
      <AnalyticsCard title="Devamsızlık Oranı Trendi" subtitle="Aylık toplam devamsızlık yüzdesi">
        <LineChart data={absenceRateTrend} labels={monthLabels} color="#DC2626" />
        <div style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
          Yaz aylarında (Temmuz-Ağustos) belirgin artış gözleniyor
        </div>
      </AnalyticsCard>

      {/* Leave types + seasonal */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsCard title="İzin Türü Dağılımı" subtitle="Son 12 ayda kullanılan izin türleri">
          <PieChart segments={leaveTypes} />
        </AnalyticsCard>

        <AnalyticsCard title="Mevsimsel Kalıplar" subtitle="Aylık toplam izin günü sayısı">
          <div className="flex items-end gap-1.5" style={{ height: 120 }}>
            {seasonalData.map((d) => {
              const h = (d.days / (maxDays * 1.1)) * 100;
              const isHigh = d.days > 100;
              return (
                <div key={d.month} className="group relative flex flex-1 flex-col items-center gap-1">
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 28,
                      height: `${h}%`,
                      background: isHigh ? '#DC2626' : '#5E5CE6',
                      borderRadius: 3,
                      minHeight: 6,
                      transition: 'height 0.4s',
                    }}
                  />
                  <span style={{ fontSize: 9, color: '#888' }}>{d.month}</span>
                  <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0A0A0A] px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {d.month}: {d.days} gün
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 10, fontSize: 12, color: '#92400E', marginTop: 16 }}>
            ⚠️ Temmuz-Ağustos{"'"}ta yıllık izin kullanımı %340 artıyor. Kapasite planlaması yapılmalı.
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 *  MAIN PAGE
 * ═══════════════════════════════════════════════════════ */

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('genel');

  return (
    <div className="flex flex-col gap-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Analitik</h1>
        <p className="mt-1 text-sm text-[#525252]">
          Organizasyonunuzun kapsamlı iş gücü analitiği ve öngörüleri.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid #f0f0f0' }} className="flex gap-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#5E5CE6' : '#888',
              borderBottom: activeTab === tab.key ? '2px solid #5E5CE6' : '2px solid transparent',
              background: 'transparent',
              transition: 'all 150ms ease',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
            className="hover:opacity-80"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'genel' && <GenelTab />}
      {activeTab === 'tukenmislik' && <TukenmislikAnalyticsTab />}
      {activeTab === 'ise-alim' && <IseAlimTab />}
      {activeTab === 'izin' && <IzinAnalyticsTab />}
    </div>
  );
}
