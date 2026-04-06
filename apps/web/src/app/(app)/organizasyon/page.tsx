'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, GitBranch, DollarSign, Clock, Building2, BarChart3, PieChart } from 'lucide-react';

/* ─── Types ─── */

interface OrgDepartment {
  name: string;
  headcount: number;
  manager: string;
  avgSalary: number;
  totalCost: number;
}

interface OrgMetrics {
  totalHeadcount: number;
  avgSpanOfControl: number;
  totalCost: number;
  avgTenure: number;
}

interface OrgHistory {
  date: string;
  headcount: number;
}

interface OrgData {
  departments: OrgDepartment[];
  levels: Record<string, number>;
  metrics: OrgMetrics;
  history: OrgHistory[];
}

/* ─── Level labels ─── */
const LEVEL_LABELS: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid-Level',
  senior: 'Senior',
  lead: 'Lead',
  manager: 'Manager',
  director: 'Director',
  unassigned: 'Atanmamis',
};

const LEVEL_COLORS: Record<string, string> = {
  junior: '#60A5FA',
  mid: '#34D399',
  senior: '#FBBF24',
  lead: '#F472B6',
  manager: '#A78BFA',
  director: '#F97316',
  unassigned: '#D1D5DB',
};

/* ─── Dept chart colors ─── */
const DEPT_COLORS = ['#5E5CE6', '#059669', '#DC2626', '#D97706', '#2563EB', '#EA580C', '#8B5CF6', '#0891B2', '#BE185D', '#65A30D'];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

export default function OrganizasyonPage() {
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'department' | 'level' | 'cost'>('department');

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/org-design')
      .then((r) => r.json())
      .then((d: OrgData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metrics = data?.metrics;
  const departments = data?.departments ?? [];
  const levels = data?.levels ?? {};

  const maxHeadcount = Math.max(...departments.map((d) => d.headcount), 1);
  const totalLevelCount = Object.values(levels).reduce((s, v) => s + v, 0) || 1;
  const maxLevelCount = Math.max(...Object.values(levels), 1);

  // Cost chart data
  const totalCostAll = departments.reduce((s, d) => s + d.totalCost, 0) || 1;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Organizasyon Tasarimi
        </h1>
        <p className="mt-1 text-sm text-[#525252]">
          Departman yapisi, seviye dagilimi ve maliyet analizi.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Users className="h-5 w-5 text-[#5E5CE6]" />}
          label="Toplam Calisan"
          value={loading ? '...' : String(metrics?.totalHeadcount ?? 0)}
          bg="bg-[#EDEDFC]"
        />
        <MetricCard
          icon={<GitBranch className="h-5 w-5 text-[#059669]" />}
          label="Ort. Kontrol Alani"
          value={loading ? '...' : String(metrics?.avgSpanOfControl ?? 0)}
          bg="bg-[#ECFDF5]"
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5 text-[#D97706]" />}
          label="Toplam Aylik Maliyet"
          value={loading ? '...' : formatCurrency(metrics?.totalCost ?? 0)}
          bg="bg-[#FFFBEB]"
        />
        <MetricCard
          icon={<Clock className="h-5 w-5 text-[#2563EB]" />}
          label="Ort. Kidem (Yil)"
          value={loading ? '...' : String(metrics?.avgTenure ?? 0)}
          bg="bg-[#EFF6FF]"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: 'department' as const, label: 'Departman Gorunumu', icon: Building2 },
          { key: 'level' as const, label: 'Seviye Dagilimi', icon: BarChart3 },
          { key: 'cost' as const, label: 'Maliyet Analizi', icon: PieChart },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
              tab === key
                ? 'bg-[#0A0A0A] text-white'
                : 'border border-[#EDEDED] bg-white text-[#525252] hover:bg-[#FAFAFA]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="rounded-xl border border-[#EDEDED] bg-white p-10 text-center text-[13px] text-[#888]">
          Veriler yukleniyor...
        </div>
      ) : tab === 'department' ? (
        <DepartmentTab departments={departments} maxHeadcount={maxHeadcount} />
      ) : tab === 'level' ? (
        <LevelTab levels={levels} maxLevelCount={maxLevelCount} totalCount={totalLevelCount} />
      ) : (
        <CostTab departments={departments} totalCostAll={totalCostAll} />
      )}
    </div>
  );
}

/* ─── Metric Card ─── */

const MetricCard = ({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) => (
  <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
        {icon}
      </div>
      <div>
        <div className="text-[12px] text-[#888]">{label}</div>
        <div className="text-[20px] font-semibold text-[#0A0A0A]">{value}</div>
      </div>
    </div>
  </div>
);

/* ─── Department Tab ─── */

const DepartmentTab = ({
  departments,
  maxHeadcount,
}: {
  departments: OrgDepartment[];
  maxHeadcount: number;
}) => (
  <div className="grid gap-4 md:grid-cols-2">
    {departments.map((dept, i) => (
      <div key={dept.name} className="rounded-xl border border-[#EDEDED] bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{dept.name}</h3>
            <p className="mt-0.5 text-[12px] text-[#888]">Yonetici: {dept.manager}</p>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-white"
            style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }}
          >
            {dept.headcount}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[12px] text-[#525252]">
            <span>Calisan Sayisi</span>
            <span className="font-medium text-[#0A0A0A]">{dept.headcount}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(dept.headcount / maxHeadcount) * 100}%`,
                backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length],
              }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#FAFAFA] p-2.5">
            <div className="text-[11px] text-[#888]">Ort. Maas</div>
            <div className="text-[13px] font-semibold text-[#0A0A0A]">
              {formatCurrency(dept.avgSalary)}
            </div>
          </div>
          <div className="rounded-lg bg-[#FAFAFA] p-2.5">
            <div className="text-[11px] text-[#888]">Toplam Maliyet</div>
            <div className="text-[13px] font-semibold text-[#0A0A0A]">
              {formatCurrency(dept.totalCost)}
            </div>
          </div>
        </div>
      </div>
    ))}
    {departments.length === 0 && (
      <div className="col-span-2 rounded-xl border border-[#EDEDED] bg-white p-10 text-center text-[13px] text-[#888]">
        Departman verisi bulunamadi.
      </div>
    )}
  </div>
);

/* ─── Level Tab ─── */

const LevelTab = ({
  levels,
  maxLevelCount,
  totalCount,
}: {
  levels: Record<string, number>;
  maxLevelCount: number;
  totalCount: number;
}) => {
  const entries = Object.entries(levels).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-xl border border-[#EDEDED] bg-white p-6">
      <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Seviye Dagilimi</h3>
      <p className="mt-1 text-[12px] text-[#888]">Calisanlarin kariyer seviyelerine gore dagilimi.</p>

      <div className="mt-6 space-y-4">
        {entries.map(([level, count]) => {
          const color = LEVEL_COLORS[level] ?? '#94A3B8';
          const label = LEVEL_LABELS[level] ?? level;
          const pct = Math.round((count / totalCount) * 100);

          return (
            <div key={level}>
              <div className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-medium text-[#0A0A0A]">{label}</span>
                </div>
                <span className="text-[#525252]">
                  {count} kisi ({pct}%)
                </span>
              </div>
              <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(count / maxLevelCount) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <div className="mt-6 text-center text-[13px] text-[#888]">Seviye verisi bulunamadi.</div>
      )}
    </div>
  );
};

/* ─── Cost Tab ─── */

const CostTab = ({
  departments,
  totalCostAll,
}: {
  departments: OrgDepartment[];
  totalCostAll: number;
}) => {
  // Sort by cost desc
  const sorted = [...departments].sort((a, b) => b.totalCost - a.totalCost);
  const maxCost = Math.max(...sorted.map((d) => d.totalCost), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Donut chart representation */}
      <div className="rounded-xl border border-[#EDEDED] bg-white p-6">
        <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Departman Maliyet Dagilimi</h3>
        <p className="mt-1 text-[12px] text-[#888]">
          Toplam: {formatCurrency(totalCostAll)}
        </p>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-10">
          {/* SVG Donut */}
          <div className="flex shrink-0 items-center justify-center">
            <DonutChart departments={sorted} totalCost={totalCostAll} />
          </div>

          {/* Legend */}
          <div className="flex flex-1 flex-col gap-2">
            {sorted.map((dept, i) => {
              const pct = Math.round((dept.totalCost / totalCostAll) * 100);
              return (
                <div key={dept.name} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }}
                    />
                    <span className="text-[#525252]">{dept.name}</span>
                  </div>
                  <span className="font-medium text-[#0A0A0A]">
                    {formatCurrency(dept.totalCost)} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cost per employee comparison */}
      <div className="rounded-xl border border-[#EDEDED] bg-white p-6">
        <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Calisan Basina Maliyet</h3>
        <p className="mt-1 text-[12px] text-[#888]">Departman bazli ortalama maas karsilastirmasi.</p>

        <div className="mt-6 space-y-3">
          {sorted.map((dept, i) => (
            <div key={dept.name}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#525252]">{dept.name}</span>
                <span className="font-medium text-[#0A0A0A]">{formatCurrency(dept.avgSalary)}</span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(dept.totalCost / maxCost) * 100}%`,
                    backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="mt-6 text-center text-[13px] text-[#888]">Maliyet verisi bulunamadi.</div>
        )}
      </div>
    </div>
  );
};

/* ─── Donut Chart SVG ─── */

const DonutChart = ({
  departments,
  totalCost,
}: {
  departments: OrgDepartment[];
  totalCost: number;
}) => {
  const size = 180;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativePercent = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#F5F5F5"
        strokeWidth={strokeWidth}
      />
      {departments.map((dept, i) => {
        const pct = dept.totalCost / totalCost;
        const dashLength = circumference * pct;
        const dashOffset = circumference * (1 - cumulativePercent) + circumference * 0.25;
        cumulativePercent += pct;

        return (
          <circle
            key={dept.name}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
          />
        );
      })}
      {/* Center text */}
      <text x={cx} y={cy - 6} textAnchor="middle" className="text-[11px] fill-[#888]">
        Toplam
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="text-[13px] font-semibold fill-[#0A0A0A]">
        {departments.length} Dept
      </text>
    </svg>
  );
};
