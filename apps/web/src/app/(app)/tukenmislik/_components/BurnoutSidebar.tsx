import { TrendingDown, AlertTriangle, Heart, ArrowDown } from 'lucide-react';

interface SidebarMetric {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  iconBg: string;
}

interface BurnoutStats {
  avg_total: number;
  red_count: number;
  total_employees: number;
}

interface BurnoutApiData {
  stats?: BurnoutStats;
  heatmap?: Array<{ department_name: string; week_start: string; avg_score: number; respondent_count: number }>;
  critical?: Array<{ id: number; ad: string; soyad: string; department_name: string; score: number }>;
  jdr?: Array<{ department_name: string; demands: number; resources: number }>;
}

interface BurnoutSidebarProps {
  apiData?: BurnoutApiData | null;
}

const buildMetrics = (apiData?: BurnoutApiData | null): SidebarMetric[] => {
  const stats = apiData?.stats;
  const avgTotal = stats?.avg_total ?? 32;
  const redCount = stats?.red_count ?? 23;

  return [
    {
      label: 'Ortalama Tukenmislik',
      value: `%${Math.round(avgTotal)}`,
      subtext: 'Sirket geneli',
      icon: <TrendingDown className="h-4 w-4 text-[#D97706]" />,
      iconBg: 'bg-[#FEF3C7]',
    },
    {
      label: 'Kirmizi Bolge',
      value: String(redCount),
      subtext: 'kisi',
      icon: <AlertTriangle className="h-4 w-4 text-[#DC2626]" />,
      iconBg: 'bg-[#FEE2E2]',
    },
    {
      label: 'Baglilik Endeksi',
      value: '78',
      subtext: '/ 100',
      icon: <Heart className="h-4 w-4 text-[#5E5CE6]" />,
      iconBg: 'bg-[#EEF0FD]',
    },
    {
      label: 'Haftalik Trend',
      value: '-5%',
      subtext: 'iyilesiyor',
      icon: <ArrowDown className="h-4 w-4 text-[#059669]" />,
      iconBg: 'bg-[#D1FAE5]',
    },
  ];
};

export const BurnoutSidebar = ({ apiData }: BurnoutSidebarProps) => {
  const metrics = buildMetrics(apiData);
  return (
    <div className="flex flex-col gap-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-white p-4"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${metric.iconBg}`}
          >
            {metric.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-[#A3A3A3]">
              {metric.label}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold tabular-nums text-[#0A0A0A]">
                {metric.value}
              </span>
              {metric.subtext && (
                <span className="text-xs text-[#A3A3A3]">
                  {metric.subtext}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
